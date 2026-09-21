import { createFileRoute } from '@tanstack/react-router';
import {
  claimPayMongoOrder,
  isPayMongoLedgerConfigured,
  markPayMongoOrderFailed,
  markPayMongoOrderFulfilled,
} from '@/lib/paymongo/ledger';
import { addCurrency } from '@/lib/playfab/economy';
import {
  WEBSITE_DATA_KEYS,
  getWebsiteRecords,
  updateWebsiteRecord,
} from '@/lib/playfab/websiteData';

type PayMongoOrder = {
  id: string;
  checkoutSessionId: string;
  playFabId: string;
  username?: string;
  packageId: string;
  coins: number;
  amountInCentavos: number;
  currency: 'PHP';
  email: string;
  status: 'pending' | 'active' | 'processing' | 'fulfilled' | 'failed';
  createdAt: string;
  updatedAt: string;
  processingAt?: string;
  processingEventId?: string;
  paidAt?: string;
  eventId?: string;
};

// Prevent duplicate deliveries from entering the credit section concurrently
// when they land on the same server instance. The persisted processing state
// protects retries that arrive after this request has finished.
const processingOrders = new Set<string>();

function signaturesFromHeader(value: string | null): Record<string, string> {
  return Object.fromEntries(
    (value || '')
      .split(/[;,]/)
      .map((part) => part.trim().split('='))
      .filter((parts) => parts.length === 2 && parts[0] && parts[1])
      .map((parts) => [parts[0] as string, parts[1] as string]),
  );
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function verifySignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  const parts = signaturesFromHeader(header);
  const timestamp = parts.t;
  if (!timestamp || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 600) return false;

  const expected = await hmacHex(secret, timestamp + '.' + rawBody);
  return (
    (!!parts.te && constantTimeEqual(expected, parts.te)) ||
    (!!parts.li && constantTimeEqual(expected, parts.li))
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export const Route = createFileRoute('/api/paymongo/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env['PAYMONGO_WEBHOOK_SECRET'];
        const playfabSecret = process.env['PLAYFAB_SECRET_KEY'];
        if (!webhookSecret || !playfabSecret || !isPayMongoLedgerConfigured()) {
          return Response.json({ error: 'Webhook is not configured.' }, { status: 503 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get('Paymongo-Signature') || request.headers.get('X-Paymongo-Signature');
        if (!(await verifySignature(rawBody, signature, webhookSecret))) {
          return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 });
        }

        try {
          const body = JSON.parse(rawBody) as Record<string, unknown>;
          const event = asRecord(body.data);
          const eventType = String(event.type || '');
          if (eventType !== 'checkout_session.payment.paid') {
            return Response.json({ received: true });
          }

          const eventData = asRecord(event.data);
          const attributes = asRecord(eventData.attributes);
          const metadata = asRecord(attributes.metadata);
          const referenceNumber = String(attributes.reference_number || metadata.orderId || '');
          const eventId = String(body.id || eventData.id || '');
          if (!referenceNumber) return Response.json({ received: true });

          const orders = await getWebsiteRecords<PayMongoOrder>(
            WEBSITE_DATA_KEYS.paymongoOrders,
            playfabSecret,
          );
          const order = orders.find(
            (item) => item.id === referenceNumber || item.checkoutSessionId === String(eventData.id || ''),
          );
          if (!order) {
            console.warn('[PayMongo] Paid checkout has no matching order:', referenceNumber);
            return Response.json({ received: true });
          }
          if (order.status === 'fulfilled' || order.status === 'processing') {
            return Response.json({ received: true });
          }

          const payments = Array.isArray(attributes.payments) ? attributes.payments : [];
          const hasPaidPayment = payments.length > 0 && payments.some((payment) => {
            const paymentAttributes = asRecord(asRecord(payment).attributes);
            const status = String(paymentAttributes.status || '').toLowerCase();
            const currency = String(paymentAttributes.currency || 'PHP').toUpperCase();
            const rawAmount = paymentAttributes.amount ?? paymentAttributes.net_amount;
            const amount = rawAmount === undefined ? undefined : Number(rawAmount);
            const amountMatches = amount === undefined || amount === order.amountInCentavos;
            return status === 'paid' && currency === 'PHP' && amountMatches;
          });
          if (!hasPaidPayment) return Response.json({ received: true });

          if (processingOrders.has(order.id)) {
            return Response.json({ received: true });
          }

          processingOrders.add(order.id);
          try {
            let claim: Awaited<ReturnType<typeof claimPayMongoOrder>>;
            try {
              claim = await claimPayMongoOrder({
                orderId: order.id,
                checkoutSessionId: String(eventData.id || order.checkoutSessionId),
                playFabId: order.playFabId,
                packageId: order.packageId,
                coins: order.coins,
                amountInCentavos: order.amountInCentavos,
                eventId,
              });
            } catch (error) {
              console.error('[PayMongo] Could not claim payment ledger order:', error);
              return Response.json({ error: 'Payment ledger unavailable; webhook will be retried.' }, { status: 500 });
            }

            if (claim.status !== 'claimed') {
              if (claim.status === 'fulfilled') {
                const repaired = await updateWebsiteRecord<PayMongoOrder>(
                  WEBSITE_DATA_KEYS.paymongoOrders,
                  order.id,
                  (current) => ({
                    ...current,
                    status: 'fulfilled',
                    paidAt: current.paidAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    eventId: current.eventId || eventId,
                  }),
                  playfabSecret,
                );
                if (!repaired) {
                  console.warn('[PayMongo] Ledger is fulfilled but the website order could not be repaired:', order.id);
                }
              }
              return Response.json({ received: true });
            }

            const credited = await addCurrency(
              order.playFabId,
              'CC',
              order.coins,
              playfabSecret,
            );
            if (!credited) {
              console.error('[PayMongo] Failed to credit order:', order.id);
              let ledgerFailed = false;
              try {
                ledgerFailed = await markPayMongoOrderFailed(
                  order.id,
                  'PlayFab currency grant did not complete.',
                );
              } catch (error) {
                console.error('[PayMongo] Could not mark failed ledger order:', error);
              }
              await updateWebsiteRecord<PayMongoOrder>(
                WEBSITE_DATA_KEYS.paymongoOrders,
                order.id,
                (current) => ({
                  ...current,
                  status: 'failed',
                  updatedAt: new Date().toISOString(),
                }),
                playfabSecret,
              );
              if (!ledgerFailed) {
                return Response.json({ error: 'Currency credit failed; manual review required.' }, { status: 500 });
              }
              return Response.json({ received: true });
            }

            let ledgerFulfilled = false;
            try {
              ledgerFulfilled = await markPayMongoOrderFulfilled(order.id, eventId);
            } catch (error) {
              console.error('[PayMongo] Currency credited but ledger fulfillment could not be saved:', error);
              return Response.json({ error: 'Ledger status could not be saved.' }, { status: 500 });
            }
            if (!ledgerFulfilled) {
              console.warn('[PayMongo] Ledger was already finalized; website order will not be credited again:', order.id);
              return Response.json({ received: true });
            }

            const updated = await updateWebsiteRecord<PayMongoOrder>(
              WEBSITE_DATA_KEYS.paymongoOrders,
              order.id,
              (current) => ({
                ...current,
                status: 'fulfilled',
                paidAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                eventId,
              }),
              playfabSecret,
            );
            if (!updated) {
              console.error('[PayMongo] Ledger fulfilled; website order could not be saved:', order.id);
            }

            return Response.json({ received: true });
          } finally {
            processingOrders.delete(order.id);
          }
        } catch (error) {
          console.error('[API] PayMongo webhook error:', error);
          return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
        }
      },
    },
  },
});
