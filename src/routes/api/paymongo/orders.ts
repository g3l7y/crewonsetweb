import { createFileRoute } from "@tanstack/react-router";
import { getPayMongoOrdersForPlayer, isPayMongoLedgerConfigured } from "@/lib/paymongo/ledger";
import { isMockMode } from "@/lib/playfab/config";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { WEBSITE_DATA_KEYS, getWebsiteRecords } from "@/lib/playfab/websiteData";

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
          return Response.json(
            {
              success: true,
              data: orders
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
