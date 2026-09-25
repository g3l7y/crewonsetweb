import { createFileRoute } from "@tanstack/react-router";
import {
  claimPayMongoOrder,
  getPayMongoOrder,
  isPayMongoLedgerConfigured,
  markPayMongoOrderFailed,
  markPayMongoOrderFulfilled,
} from "@/lib/paymongo/ledger";
import { addCurrency, getCcoinCurrencyCode } from "@/lib/playfab/economy";
import { isMockMode } from "@/lib/playfab/config";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import {
  WEBSITE_DATA_KEYS,
  getWebsiteRecords,
  updateWebsiteRecord,
} from "@/lib/playfab/websiteData";
import { recordPlayerTopUpNotification } from "@/lib/paymongo/player-notifications";
import { isPaidCheckoutAmount } from "@/lib/paymongo/verification";

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
};

type PayMongoCheckoutResponse = {
  data?: {
    id?: string;
    attributes?: {
      payments?: unknown[];
      payment_intent?: {
        attributes?: {
          amount?: number;
          currency?: string;
          status?: string;
        };
      };
    };
  };
};

function getSecret(name: "PAYMONGO_SECRET_KEY" | "PLAYFAB_SECRET_KEY"): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

async function retrievePaidCheckout(
  checkoutSessionId: string,
  paymongoSecret: string,
  expectedAmount: number,
): Promise<boolean> {
  const response = await fetch(
    `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`,
    {
      headers: {
        Authorization: "Basic " + btoa(paymongoSecret + ":"),
        Accept: "application/json",
      },
    },
  );
  const result = (await response.json().catch(() => ({}))) as PayMongoCheckoutResponse;
  if (!response.ok) {
    throw new Error(`PayMongo checkout verification failed with status ${response.status}.`);
  }

  return isPaidCheckoutAmount(asRecord(result.data?.attributes), expectedAmount);
}

async function repairWebsiteOrder(
  orderId: string,
  playfabSecret: string,
  status: PayMongoOrder["status"],
  eventId?: string,
) {
  await updateWebsiteRecord<PayMongoOrder>(
    WEBSITE_DATA_KEYS.paymongoOrders,
    orderId,
    (current) => ({
      ...current,
      status,
      ...(status === "fulfilled" ? { paidAt: current.paidAt || new Date().toISOString() } : {}),
      ...(eventId ? { eventId: current.eventId || eventId } : {}),
      updatedAt: new Date().toISOString(),
    }),
    playfabSecret,
  );
}

async function reconcilePaidOrder(
  order: PayMongoOrder,
  mockMode: boolean,
  playfabSecret: string | null,
) {
  const paymongoSecret = getSecret("PAYMONGO_SECRET_KEY");
  if (!paymongoSecret) throw new Error("PayMongo is not configured on this server.");

  const paid = await retrievePaidCheckout(
    order.checkoutSessionId,
    paymongoSecret,
    order.amountInCentavos,
  );
  if (!paid) return order.status;

  const eventId = `return:${order.checkoutSessionId}`;
  const claim = await claimPayMongoOrder({
    orderId: order.id,
    checkoutSessionId: order.checkoutSessionId,
    playFabId: order.playFabId,
    packageId: order.packageId,
    coins: order.coins,
    amountInCentavos: order.amountInCentavos,
    eventId,
  });

  if (claim.status === "fulfilled") {
    if (!mockMode && playfabSecret)
      await repairWebsiteOrder(order.id, playfabSecret, "fulfilled", eventId);
    return "fulfilled";
  }
  if (claim.status !== "claimed") return claim.status;

  if (!mockMode) {
    if (!playfabSecret) throw new Error("PlayFab server credentials are missing.");
    const credited = await addCurrency(
      order.playFabId,
      getCcoinCurrencyCode(),
      order.coins,
      playfabSecret,
      { source: "paymongo", orderId: order.id },
    );
    if (!credited.success) {
      await markPayMongoOrderFailed(order.id, credited.error);
      await repairWebsiteOrder(order.id, playfabSecret, "failed");
      console.error("[PayMongo] C-Coin delivery will be retried:", order.id, credited.error);
      return "processing";
    }
  }

  const fulfilled = await markPayMongoOrderFulfilled(order.id, eventId);
  if (!fulfilled) return "fulfilled";
  if (!mockMode && playfabSecret)
    await repairWebsiteOrder(order.id, playfabSecret, "fulfilled", eventId);
  return "fulfilled";
}

export const Route = createFileRoute("/api/paymongo/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isPayMongoLedgerConfigured()) {
          return Response.json({ error: "Payment ledger is not configured." }, { status: 503 });
        }

        const session = await validateSessionFromRequest(request);
        if (!session) return unauthorizedSessionResponse();

        const orderId = new URL(request.url).searchParams.get("orderId")?.trim();
        if (!orderId) {
          return Response.json({ error: "An order reference is required." }, { status: 400 });
        }

        try {
          const mockMode = isMockMode();
          const playfabSecret = getSecret("PLAYFAB_SECRET_KEY");
          const ledgerOrder = await getPayMongoOrder(orderId);
          let order: PayMongoOrder | null = ledgerOrder
            ? {
                id: ledgerOrder.orderId,
                checkoutSessionId: ledgerOrder.checkoutSessionId,
                playFabId: ledgerOrder.playFabId,
                packageId: ledgerOrder.packageId,
                coins: ledgerOrder.coins,
                amountInCentavos: ledgerOrder.amountInCentavos,
                currency: "PHP",
                email: "",
                status: ledgerOrder.status,
                createdAt: ledgerOrder.createdAt,
                updatedAt: ledgerOrder.fulfilledAt || ledgerOrder.createdAt,
                ...(ledgerOrder.fulfilledAt ? { paidAt: ledgerOrder.fulfilledAt } : {}),
              }
            : null;

          if (!order && !mockMode) {
            if (!playfabSecret) {
              return Response.json(
                { error: "PlayFab server credentials are missing." },
                { status: 503 },
              );
            }
            const orders = await getWebsiteRecords<PayMongoOrder>(
              WEBSITE_DATA_KEYS.paymongoOrders,
              playfabSecret,
            );
            order =
              orders.find((item) => item.id === orderId || item.checkoutSessionId === orderId) ??
              null;
          }

          if (!order || order.playFabId !== session.playFabId) {
            return Response.json({ error: "Payment order not found." }, { status: 404 });
          }

          let status = order.status;
          if (status !== "fulfilled") {
            status = (await reconcilePaidOrder(
              order,
              mockMode,
              playfabSecret,
            )) as PayMongoOrder["status"];
          }

          const settledLedger = status === "fulfilled" ? await getPayMongoOrder(orderId) : null;
          const completedAt = settledLedger?.fulfilledAt || order.paidAt || order.updatedAt;
          if (status === "fulfilled" && !mockMode && playfabSecret) {
            const notificationSaved = await recordPlayerTopUpNotification(
              {
                id: order.id,
                playFabId: order.playFabId,
                ...(order.username ? { username: order.username } : {}),
                coins: order.coins,
                amountInCentavos: order.amountInCentavos,
                completedAt,
              },
              playfabSecret,
            );
            if (!notificationSaved) {
              console.warn("[PayMongo] Player top-up notification could not be saved:", order.id);
            }
          }

          return Response.json({
            orderId: order.id,
            status,
            coins: order.coins,
            amountInCentavos: order.amountInCentavos,
            packageId: order.packageId,
            timestamp: completedAt,
          });
        } catch (error) {
          console.error("[PayMongo] Payment status/reconciliation error:", error);
          return Response.json(
            { error: "Payment status is temporarily unavailable." },
            { status: 503 },
          );
        }
      },
    },
  },
});
