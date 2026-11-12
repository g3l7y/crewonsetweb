import { createFileRoute } from "@tanstack/react-router";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { WEBSITE_DATA_KEYS, getWebsiteRecords, setWebsiteRecords } from "@/lib/playfab/websiteData";
import type { PartnershipPayment } from "@/lib/playfab/types";
import { deliverRefundUpdates } from "@/lib/paymongo/refund-delivery";

type PayMongoOrder = {
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
  eventId?: string;
  paymentMethod?: string;
  refunds?: Array<{ id: string; amount: number; status: "pending" | "processing" | "succeeded" | "failed"; reason: string; notes?: string; createdAt: string; receiptEmailSentAt?: string; notificationSentAt?: string }>;
  refundedAmount?: number;
};

type AdminTopUp = {
  id: string;
  playerName: string;
  playerId: string;
  date: string;
  time: string;
  timestamp: string;
  bank: string;
  amount: number;
  status: "Completed" | "Pending" | "Failed" | "Partially Refunded" | "Refunded";
  email?: string;
  item?: string;
  coins?: number;
  packageId?: string;
  checkoutSessionId?: string;
  paymentMethod?: string;
  transactionType: "top-up" | "partnership";
  paidAt?: string;
  eventId?: string;
  refundedAmount?: number;
  refunds?: Array<{ id: string; amount: number; status: "pending" | "processing" | "succeeded" | "failed"; reason: string; notes?: string; createdAt: string; receiptEmailSentAt?: string; notificationSentAt?: string }>;
};

const PAYMONGO_API = "https://api.paymongo.com/v1";
const refundStatuses = new Set(["pending", "processing", "succeeded", "failed"]);

function payMongoAuth(secret: string) {
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

async function refreshRefundStatuses<T extends { id: string; refunds?: PayMongoOrder["refunds"]; refundedAmount?: number; updatedAt?: string; amountInCentavos: number; email?: string; username?: string; brand?: string; playFabId?: string }>(
  collection: string,
  records: T[],
  secret: string,
  playfabSecret: string,
  kind: "top-up" | "partnership",
) {
  let changed = false;
  const headers = { Authorization: payMongoAuth(secret) };
  const refreshed = await Promise.all(records.map(async (record) => {
    let recordChanged = false;
    const refunds = await Promise.all((record.refunds ?? []).map(async (refund) => {
      if (refund.status !== "pending" && refund.status !== "processing") return refund;
      try {
        const response = await fetch(`${PAYMONGO_API}/refunds/${encodeURIComponent(refund.id)}`, { headers, cache: "no-store" });
        if (!response.ok) return refund;
        const result = await response.json() as { data?: { attributes?: { status?: string } } };
        const status = result.data?.attributes?.status;
        if (!status || !refundStatuses.has(status) || status === refund.status) return refund;
        recordChanged = true;
        return { ...refund, status: status as typeof refund.status };
      } catch {
        return refund;
      }
    }));
    let refreshedRecord = recordChanged ? { ...record, refunds, updatedAt: new Date().toISOString() } : record;
    if (recordChanged) {
      const succeededRefundTotal = refunds.filter((refund) => refund.status === "succeeded").reduce((sum, refund) => sum + refund.amount, 0);
      refreshedRecord = { ...refreshedRecord, refundedAmount: succeededRefundTotal };
    }
    const delivered = await deliverRefundUpdates(refreshedRecord, kind, playfabSecret);
    if (delivered !== refreshedRecord) {
      refreshedRecord = delivered;
      recordChanged = true;
    }
    if (!recordChanged) return record;
    changed = true;
    return { ...refreshedRecord, updatedAt: new Date().toISOString() };
  }));
  if (changed) await setWebsiteRecords(collection, refreshed, playfabSecret);
  return refreshed;
}

function getStatus(
  status: PayMongoOrder["status"] | PartnershipPayment["status"],
): AdminTopUp["status"] {
  if (status === "fulfilled") return "Completed";
  if (status === "failed") return "Failed";
  return "Pending";
}

function timestampParts(timestamp: string) {
  const date = new Date(timestamp);
  return {
    date: Number.isNaN(date.getTime()) ? timestamp.slice(0, 10) : date.toISOString().slice(0, 10),
    time: Number.isNaN(date.getTime())
      ? "--:--"
      : date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function refundStatus(amount: number, refundedAmount: number) {
  if (refundedAmount <= 0) return getStatus("fulfilled");
  return refundedAmount >= amount ? "Refunded" : "Partially Refunded";
}

function toAdminTopUp(order: PayMongoOrder): AdminTopUp {
  const timestamp = order.paidAt || order.updatedAt || order.createdAt;
  const parts = timestampParts(timestamp);
  return {
    id: order.id,
    playerName: order.username || order.playFabId,
    playerId: order.playFabId,
    ...parts,
    timestamp,
    bank: "PayMongo",
    amount: order.amountInCentavos / 100,
    status: order.status === "fulfilled" ? refundStatus(order.amountInCentavos, order.refundedAmount ?? 0) : getStatus(order.status),
    email: order.email,
    item: order.coins.toLocaleString("en-PH") + " C-Coins",
    coins: order.coins,
    packageId: order.packageId,
    checkoutSessionId: order.checkoutSessionId,
    paymentMethod: "PayMongo",
    transactionType: "top-up",
    ...(order.paidAt ? { paidAt: order.paidAt } : {}),
    ...(order.eventId ? { eventId: order.eventId } : {}),
    ...(order.refundedAmount ? { refundedAmount: order.refundedAmount / 100 } : {}),
    ...(order.refunds ? { refunds: order.refunds.map((refund) => ({ ...refund, amount: refund.amount / 100 })) } : {}),
  };
}

function toAdminPartnershipPayment(payment: PartnershipPayment & { refunds?: PayMongoOrder["refunds"]; refundedAmount?: number }): AdminTopUp {
  const timestamp = payment.paidAt || payment.updatedAt || payment.createdAt;
  const parts = timestampParts(timestamp);
  return {
    id: payment.id,
    playerName: payment.brand,
    playerId: payment.applicationId,
    ...parts,
    timestamp,
    bank: "PayMongo · Brand Partnership",
    amount: payment.amountInCentavos / 100,
    status: payment.status === "fulfilled" ? refundStatus(payment.amountInCentavos, payment.refundedAmount ?? 0) : getStatus(payment.status),
    email: payment.email,
    item: "Brand partnership payment",
    checkoutSessionId: payment.checkoutSessionId,
    paymentMethod: "PayMongo",
    transactionType: "partnership",
    ...(payment.paidAt ? { paidAt: payment.paidAt } : {}),
    ...(payment.eventId ? { eventId: payment.eventId } : {}),
    ...(payment.refundedAmount ? { refundedAmount: payment.refundedAmount / 100 } : {}),
    ...(payment.refunds ? { refunds: payment.refunds.map((refund) => ({ ...refund, amount: refund.amount / 100 })) } : {}),
  };
}

export const Route = createFileRoute("/api/admin/paymongo-orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }

        const playfabSecret = process.env["PLAYFAB_SECRET_KEY"];
        if (!playfabSecret)
          return Response.json(
            { success: true, data: [] },
            { headers: { "Cache-Control": "no-store" } },
          );

        const [rawOrders, rawPartnershipPayments] = await Promise.all([
          getWebsiteRecords<PayMongoOrder>(WEBSITE_DATA_KEYS.paymongoOrders, playfabSecret),
          getWebsiteRecords<PartnershipPayment>(
            WEBSITE_DATA_KEYS.partnershipPayments,
            playfabSecret,
          ),
        ]);

        const paymongoSecret = process.env["PAYMONGO_SECRET_KEY"]?.trim();
        const [orders, partnershipPayments] = paymongoSecret
          ? await Promise.all([
              refreshRefundStatuses(WEBSITE_DATA_KEYS.paymongoOrders, rawOrders, paymongoSecret, playfabSecret, "top-up"),
              refreshRefundStatuses(WEBSITE_DATA_KEYS.partnershipPayments, rawPartnershipPayments as Array<PartnershipPayment & { refunds?: PayMongoOrder["refunds"]; refundedAmount?: number }>, paymongoSecret, playfabSecret, "partnership"),
            ])
          : [rawOrders, rawPartnershipPayments];

        return Response.json(
          {
            success: true,
            data: [
              ...orders.filter((order) => order.currency === "PHP").map(toAdminTopUp),
              ...partnershipPayments
                .filter((payment) => payment.currency === "PHP")
                .map(toAdminPartnershipPayment),
            ].sort((left, right) => (right.date + right.time).localeCompare(left.date + left.time)),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
