import { createFileRoute } from "@tanstack/react-router";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { WEBSITE_DATA_KEYS, getWebsiteRecords, updateWebsiteRecord } from "@/lib/playfab/websiteData";
import type { PartnershipPayment } from "@/lib/playfab/types";
import { deliverRefundUpdates } from "@/lib/paymongo/refund-delivery";

type Refund = {
  id: string;
  amount: number;
  status: "pending" | "processing" | "succeeded" | "failed";
  reason: string;
  notes?: string;
  createdAt: string;
  receiptEmailSentAt?: string;
  notificationSentAt?: string;
};

type PayMongoPaymentRecord = {
  id: string;
  checkoutSessionId: string;
  amountInCentavos: number;
  currency: "PHP";
  status: string;
  refunds?: Refund[];
  refundedAmount?: number;
};

const PAYMONGO_API = "https://api.paymongo.com/v1";
const refundReasons = new Set(["duplicate", "fraudulent", "requested_by_customer", "others"]);

function authHeader(secret: string) {
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export const Route = createFileRoute("/api/admin/paymongo-refunds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }

        const secret = process.env["PAYMONGO_SECRET_KEY"]?.trim();
        const playfabSecret = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secret || !playfabSecret) {
          return Response.json({ error: "Refund processing is not configured on this server." }, { status: 503 });
        }

        let body: { transactionId?: unknown; transactionType?: unknown; amount?: unknown; reason?: unknown; notes?: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid refund request." }, { status: 400 });
        }

        const id = typeof body.transactionId === "string" ? body.transactionId : "";
        const type = body.transactionType === "partnership" ? "partnership" : body.transactionType === "top-up" ? "top-up" : null;
        const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
        const reason = typeof body.reason === "string" ? body.reason : "";
        const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 255) : "";
        const amountInCentavos = Math.round(amount * 100);
        if (!id || !type || !Number.isFinite(amountInCentavos) || amountInCentavos < 100 || !refundReasons.has(reason)) {
          return Response.json({ error: "Enter a valid refund amount and reason." }, { status: 400 });
        }

        const collection = type === "partnership" ? WEBSITE_DATA_KEYS.partnershipPayments : WEBSITE_DATA_KEYS.paymongoOrders;
        const records = type === "partnership"
          ? await getWebsiteRecords<PartnershipPayment & PayMongoPaymentRecord>(collection, playfabSecret)
          : await getWebsiteRecords<PayMongoPaymentRecord & { playFabId: string; username?: string; email?: string }>(collection, playfabSecret);
        const record = records.find((item) => item.id === id);
        if (!record) return Response.json({ error: "The payment record could not be found." }, { status: 404 });
        if (record.status !== "fulfilled") return Response.json({ error: "Only completed payments can be refunded." }, { status: 409 });
        if (!record.checkoutSessionId) return Response.json({ error: "This payment has no PayMongo checkout reference." }, { status: 409 });

        const reservedAmount = (record.refunds ?? [])
          .filter((refund) => refund.status !== "failed")
          .reduce((sum, refund) => sum + refund.amount, 0);
        const remaining = Math.max(0, record.amountInCentavos - reservedAmount);
        if (amountInCentavos > remaining) {
          return Response.json({ error: `The maximum refundable balance is ₱${(remaining / 100).toFixed(2)}.` }, { status: 409 });
        }

        const headers = { Authorization: authHeader(secret), "Content-Type": "application/json" };
        const sessionResponse = await fetch(`${PAYMONGO_API}/checkout_sessions/${encodeURIComponent(record.checkoutSessionId)}`, { headers, cache: "no-store" });
        const sessionJson = await sessionResponse.json().catch(() => ({})) as {
          data?: { attributes?: { payments?: Array<{ id?: string; attributes?: { status?: string; currency?: string } }> } };
          errors?: Array<{ detail?: string }>;
        };
        if (!sessionResponse.ok) {
          return Response.json({ error: sessionJson.errors?.[0]?.detail || "Could not verify the payment with PayMongo." }, { status: 502 });
        }
        const payment = sessionJson.data?.attributes?.payments?.find((item) => item.id && item.attributes?.status === "paid" && item.attributes.currency === "PHP");
        if (!payment?.id) return Response.json({ error: "PayMongo did not return a completed PHP payment for this checkout." }, { status: 409 });

        const refundResponse = await fetch(`${PAYMONGO_API}/refunds`, {
          method: "POST",
          headers,
          body: JSON.stringify({ data: { attributes: { amount: amountInCentavos, payment_id: payment.id, reason, ...(notes ? { notes } : {}) } } }),
        });
        const refundJson = await refundResponse.json().catch(() => ({})) as {
          data?: { id?: string; attributes?: { amount?: number; status?: Refund["status"]; reason?: string; notes?: string; created_at?: number } };
          errors?: Array<{ detail?: string }>;
        };
        const refundData = refundJson.data;
        if (!refundResponse.ok || !refundData?.id || !refundData.attributes) {
          return Response.json({ error: refundJson.errors?.[0]?.detail || "PayMongo could not create this refund." }, { status: 502 });
        }

        const attrs = refundData.attributes;
        const refund: Refund = {
          id: refundData.id,
          amount: attrs.amount ?? amountInCentavos,
          status: attrs.status ?? "pending",
          reason: attrs.reason ?? reason,
          ...(attrs.notes || notes ? { notes: attrs.notes || notes } : {}),
          createdAt: attrs.created_at ? new Date(attrs.created_at * 1000).toISOString() : new Date().toISOString(),
        };
        let saved = await updateWebsiteRecord<PayMongoPaymentRecord>(collection, id, (current) => {
          const refunds = [...(current.refunds ?? []), refund];
          const refundedAmount = refunds.filter((item) => item.status === "succeeded").reduce((sum, item) => sum + item.amount, 0);
          return { ...current, refunds, refundedAmount, updatedAt: new Date().toISOString() };
        }, playfabSecret);
        if (!saved) {
          return Response.json({ error: "PayMongo created the refund, but the website could not save its refund record. Refresh before retrying to avoid a duplicate refund.", refund }, { status: 500 });
        }

        if (refund.status === "succeeded") {
          const recipientPayment = {
            ...saved,
            email: record.email,
            username: "username" in record ? record.username : undefined,
            brand: "brand" in record ? record.brand : undefined,
            playFabId: "playFabId" in record ? record.playFabId : undefined,
          };
          const delivered = await deliverRefundUpdates(recipientPayment, type, playfabSecret);
          const deliveredRefund = delivered.refunds?.find((item) => item.id === refund.id);
          if (deliveredRefund && (deliveredRefund.receiptEmailSentAt || deliveredRefund.notificationSentAt)) {
            saved = await updateWebsiteRecord<PayMongoPaymentRecord>(collection, id, (current) => ({
              ...current,
              refunds: (current.refunds ?? []).map((item) => item.id === refund.id ? deliveredRefund : item),
            }), playfabSecret) ?? saved;
          }
        }

        const finalRefund = saved.refunds?.find((item) => item.id === refund.id) ?? refund;
        return Response.json({ success: true, refund: { ...finalRefund, amount: finalRefund.amount / 100 }, remaining: (record.amountInCentavos - reservedAmount - refund.amount) / 100 });
      },
    },
  },
});
