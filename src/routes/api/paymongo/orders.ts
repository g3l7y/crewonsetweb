import { createFileRoute } from "@tanstack/react-router";
import { getPayMongoOrdersForPlayer, isPayMongoLedgerConfigured } from "@/lib/paymongo/ledger";
import { isMockMode } from "@/lib/playfab/config";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { WEBSITE_DATA_KEYS, getWebsiteRecords, setWebsiteRecords } from "@/lib/playfab/websiteData";
import { deliverRefundUpdates } from "@/lib/paymongo/refund-delivery";

type StoredPayMongoOrder = {
  id: string;
  checkoutSessionId: string;
  playFabId: string;
  username?: string;
  packageId: string;
  coins: number;
  amountInCentavos: number;
  currency: "PHP";
  email: string;
  status: "pending" | "active" | "processing" | "fulfilled" | "failed";
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  paymentMethod?: string;
  eventId?: string;
  refunds?: Array<{ id: string; amount: number; status: "pending" | "processing" | "succeeded" | "failed"; reason: string; notes?: string; createdAt: string; receiptEmailSentAt?: string; notificationSentAt?: string }>;
  refundedAmount?: number;
};

export const Route = createFileRoute("/api/paymongo/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session) return unauthorizedSessionResponse();

        try {
          if (isMockMode()) {
            if (!isPayMongoLedgerConfigured()) {
              return Response.json({ success: true, data: [] }, { headers: { "Cache-Control": "no-store" } });
            }
            const orders = await getPayMongoOrdersForPlayer(session.playFabId);
            return Response.json(
              {
                success: true,
                data: orders.map((order) => ({
                  id: order.orderId,
                  checkoutSessionId: order.checkoutSessionId,
                  packageId: order.packageId,
                  coins: order.coins,
                  amountInCentavos: order.amountInCentavos,
                  status: order.status,
                  createdAt: order.createdAt,
                  paidAt: order.fulfilledAt,
                  paymentMethod: order.paymentMethod,
                  email: session.email || "",
                  eventId: order.eventId,
                })),
              },
              { headers: { "Cache-Control": "no-store" } },
            );
          }

          const secret = process.env["PLAYFAB_SECRET_KEY"]?.trim();
          if (!secret) {
            return Response.json({ success: true, data: [] }, { headers: { "Cache-Control": "no-store" } });
          }
          const orders = await getWebsiteRecords<StoredPayMongoOrder>(
            WEBSITE_DATA_KEYS.paymongoOrders,
            secret,
          );
          let changed = false;
          const paymongoSecret = process.env["PAYMONGO_SECRET_KEY"]?.trim();
          const refreshedOrders = await Promise.all(orders.map(async (order) => {
            if (order.playFabId !== session.playFabId || order.currency !== "PHP") return order;
            let next = order;
            if (paymongoSecret && (order.refunds ?? []).some((refund) => refund.status === "pending" || refund.status === "processing")) {
              const refunds = await Promise.all((order.refunds ?? []).map(async (refund) => {
                if (refund.status !== "pending" && refund.status !== "processing") return refund;
                try {
                  const response = await fetch(`https://api.paymongo.com/v1/refunds/${encodeURIComponent(refund.id)}`, {
                    headers: { Authorization: `Basic ${Buffer.from(`${paymongoSecret}:`).toString("base64")}` },
                    cache: "no-store",
                  });
                  const result = await response.json().catch(() => ({})) as { data?: { attributes?: { status?: typeof refund.status } } };
                  const status = result.data?.attributes?.status;
                  return response.ok && (status === "pending" || status === "processing" || status === "succeeded" || status === "failed")
                    ? { ...refund, status }
                    : refund;
                } catch { return refund; }
              }));
              if (refunds.some((refund, index) => refund.status !== order.refunds?.[index]?.status)) {
                next = { ...next, refunds, refundedAmount: refunds.filter((refund) => refund.status === "succeeded").reduce((sum, refund) => sum + refund.amount, 0), updatedAt: new Date().toISOString() };
              }
            }
            if (paymongoSecret) {
              const delivered = await deliverRefundUpdates({ ...next, playFabId: order.playFabId, username: order.username, email: order.email }, "top-up", secret);
              if (delivered !== next) next = { ...next, refunds: delivered.refunds };
            }
            if (next !== order) changed = true;
            return next;
          }));
          if (changed) await setWebsiteRecords(WEBSITE_DATA_KEYS.paymongoOrders, refreshedOrders, secret);
          return Response.json(
            {
              success: true,
              data: refreshedOrders
                .filter((order) => order.playFabId === session.playFabId && order.currency === "PHP")
                .map((order) => ({
                  id: order.id,
                  checkoutSessionId: order.checkoutSessionId,
                  packageId: order.packageId,
                  coins: order.coins,
                  amountInCentavos: order.amountInCentavos,
                  status: order.status,
                  createdAt: order.createdAt,
                  paidAt: order.paidAt,
                  paymentMethod: order.paymentMethod,
                  email: order.email,
                  updatedAt: order.updatedAt,
                  eventId: order.eventId,
                  refunds: order.refunds,
                  refundedAmount: order.refundedAmount,
                }))
                .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("[PayMongo] Player order history error:", error);
          return Response.json({ error: "Transaction history is temporarily unavailable." }, { status: 503 });
        }
      },
    },
  },
});
