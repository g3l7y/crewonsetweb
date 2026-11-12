import { sendPayMongoRefundReceiptEmail } from "@/lib/account-email";
import { recordPlayerRefundNotification } from "@/lib/paymongo/player-notifications";

export type RefundRecord = {
  id: string;
  amount: number;
  status: "pending" | "processing" | "succeeded" | "failed";
  reason: string;
  notes?: string;
  createdAt: string;
  receiptEmailSentAt?: string;
  notificationSentAt?: string;
};

type RefundPayment = {
  id: string;
  amountInCentavos: number;
  email?: string;
  username?: string;
  brand?: string;
  playFabId?: string;
  refunds?: RefundRecord[];
};

/** Deliver receipts/notices once refunds are confirmed; failed deliveries remain retryable. */
export async function deliverRefundUpdates<T extends RefundPayment>(
  payment: T,
  kind: "top-up" | "partnership",
  playfabSecret: string,
): Promise<T> {
  let changed = false;
  const refunds = await Promise.all((payment.refunds ?? []).map(async (refund) => {
    if (refund.status !== "succeeded") return refund;
    let next = refund;

    if (payment.email && !refund.receiptEmailSentAt) {
      try {
        const sent = await sendPayMongoRefundReceiptEmail(payment.email, {
          recipientName: kind === "partnership" ? payment.brand || "Brand partner" : payment.username || "Player",
          transactionLabel: kind === "partnership" ? `Brand promotion payment${payment.brand ? ` · ${payment.brand}` : ""}` : "C-Coin top-up",
          refundAmountPhp: refund.amount / 100,
          originalAmountPhp: payment.amountInCentavos / 100,
          refundId: refund.id,
          paymentReference: payment.id,
          reason: refund.reason,
          notes: refund.notes,
          refundDate: refund.createdAt,
        });
        if (sent) next = { ...next, receiptEmailSentAt: new Date().toISOString() };
      } catch (error) {
        console.error("Refund receipt email could not be delivered", error);
      }
    }

    if (kind === "top-up" && payment.playFabId && !refund.notificationSentAt) {
      try {
        const saved = await recordPlayerRefundNotification({
          id: refund.id,
          playFabId: payment.playFabId,
          username: payment.username,
          amountInCentavos: refund.amount,
          createdAt: refund.createdAt,
          reason: refund.reason,
          notes: refund.notes,
        }, playfabSecret);
        if (saved) next = { ...next, notificationSentAt: new Date().toISOString() };
      } catch (error) {
        console.error("Player refund notification could not be recorded", error);
      }
    }

    if (next !== refund) changed = true;
    return next;
  }));
  return changed ? { ...payment, refunds } : payment;
}
