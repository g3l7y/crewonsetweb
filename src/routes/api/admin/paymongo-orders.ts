import { createFileRoute } from "@tanstack/react-router";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { WEBSITE_DATA_KEYS, getWebsiteRecords } from "@/lib/playfab/websiteData";
import type { PartnershipPayment } from "@/lib/playfab/types";

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
  status: "Completed" | "Pending" | "Failed";
  email?: string;
  item?: string;
  coins?: number;
  packageId?: string;
  checkoutSessionId?: string;
  paymentMethod?: string;
  transactionType: "top-up" | "partnership";
  paidAt?: string;
  eventId?: string;
};

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

function toAdminTopUp(order: PayMongoOrder): AdminTopUp {
  const timestamp = order.paidAt || order.updatedAt || order.createdAt;
  const parts = timestampParts(timestamp);
  return {
    id: order.id,
    playerName: order.username || order.playFabId,
    playerId: order.playFabId,
    ...parts,
    timestamp,
    bank: "PayMongo Hosted Checkout",
    amount: order.amountInCentavos / 100,
    status: getStatus(order.status),
    email: order.email,
    item: order.coins.toLocaleString("en-PH") + " C-Coins",
    coins: order.coins,
    packageId: order.packageId,
    checkoutSessionId: order.checkoutSessionId,
    ...(order.paymentMethod ? { paymentMethod: order.paymentMethod } : {}),
    transactionType: "top-up",
    ...(order.paidAt ? { paidAt: order.paidAt } : {}),
    ...(order.eventId ? { eventId: order.eventId } : {}),
  };
}

function toAdminPartnershipPayment(payment: PartnershipPayment): AdminTopUp {
  const timestamp = payment.paidAt || payment.updatedAt || payment.createdAt;
  const parts = timestampParts(timestamp);
  return {
    id: payment.id,
    playerName: payment.brand,
    playerId: payment.applicationId,
    ...parts,
    timestamp,
    bank: "PayMongo Hosted Checkout · Brand Partnership",
    amount: payment.amountInCentavos / 100,
    status: getStatus(payment.status),
    email: payment.email,
    item: "Brand partnership payment",
    checkoutSessionId: payment.checkoutSessionId,
    ...(payment.paymentMethod ? { paymentMethod: payment.paymentMethod } : {}),
    transactionType: "partnership",
    ...(payment.paidAt ? { paidAt: payment.paidAt } : {}),
    ...(payment.eventId ? { eventId: payment.eventId } : {}),
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

        const [orders, partnershipPayments] = await Promise.all([
          getWebsiteRecords<PayMongoOrder>(WEBSITE_DATA_KEYS.paymongoOrders, playfabSecret),
          getWebsiteRecords<PartnershipPayment>(
            WEBSITE_DATA_KEYS.partnershipPayments,
            playfabSecret,
          ),
        ]);

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
