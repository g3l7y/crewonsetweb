import { createFileRoute } from '@tanstack/react-router';
import { coinPackages } from '@/lib/demo/portal-shop';
import { isValidEmail } from '@/lib/validation';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import {
  WEBSITE_DATA_KEYS,
  appendWebsiteRecord,
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
  status: 'pending' | 'active' | 'fulfilled' | 'failed';
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  eventId?: string;
};

function getSecret(name: 'PAYMONGO_SECRET_KEY' | 'PLAYFAB_SECRET_KEY'): string | null {
  return process.env[name] || null;
}

function createOrderId(): string {
  return 'COS-COIN-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function getPaymentMethodTypes(): string[] {
  const configured = process.env['PAYMONGO_PAYMENT_METHOD_TYPES'];
  const methods = (configured || 'card,gcash,qrph')
    .split(',')
    .map((method) => method.trim())
    .filter(Boolean);
  return methods.length > 0 ? methods : ['card', 'gcash', 'qrph'];
}

export const Route = createFileRoute('/api/paymongo/checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session) return unauthorizedSessionResponse();

        const paymongoSecret = getSecret('PAYMONGO_SECRET_KEY');
        const playfabSecret = getSecret('PLAYFAB_SECRET_KEY');
        if (!paymongoSecret || !playfabSecret) {
          return Response.json(
            { error: 'PayMongo checkout is not configured on this server yet.' },
            { status: 503 },
          );
        }

        try {
          const body = (await request.json()) as {
            packageId?: unknown;
            email?: unknown;
          };
          const packageId = typeof body.packageId === 'string' ? body.packageId : '';
          const email = typeof body.email === 'string' ? body.email.trim() : '';
          const pack = coinPackages.find((item) => item.id === packageId);

          if (!pack) {
            return Response.json({ error: 'The selected C-Coin package is not available.' }, { status: 400 });
          }
          if (!isValidEmail(email)) {
            return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
          }

          const orderId = createOrderId();
          const totalCoins = pack.coins;
          const amountInCentavos = Math.round(pack.pricePhp * 100);
          const publicAppUrl = (process.env['PUBLIC_APP_URL'] || new URL(request.url).origin).replace(/\/$/, '');
          const now = new Date().toISOString();
          const order: PayMongoOrder = {
            id: orderId,
            checkoutSessionId: 'pending',
            playFabId: session.playFabId,
            username: session.username || session.displayName || undefined,
            packageId: pack.id,
            coins: totalCoins,
            amountInCentavos,
            currency: 'PHP',
            email,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
          };
          const saved = await appendWebsiteRecord(
            WEBSITE_DATA_KEYS.paymongoOrders,
            order,
            playfabSecret,
          );
          if (!saved) {
            return Response.json(
              { error: 'The checkout could not be recorded. Please try again.' },
              { status: 500 },
            );
          }

          const paymongoResponse = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + btoa(paymongoSecret + ':'),
              'Content-Type': 'application/json',
              'Idempotency-Key': orderId,
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  line_items: [
                    {
                      name: totalCoins + ' C-Coins',
                      amount: amountInCentavos,
                      currency: 'PHP',
                      quantity: 1,
                    },
                  ],
                  payment_method_types: getPaymentMethodTypes(),
                  success_url: publicAppUrl + '/portal/shop?payment=success&reference=' + encodeURIComponent(orderId),
                  cancel_url: publicAppUrl + '/portal/shop?payment=cancelled&reference=' + encodeURIComponent(orderId),
                  reference_number: orderId,
                  send_email_receipt: true,
                  metadata: {
                    orderId,
                    playFabId: session.playFabId,
                    packageId: pack.id,
                    coins: String(totalCoins),
                  },
                },
              },
            }),
          });

          const providerBody = (await paymongoResponse.json().catch(() => ({}))) as {
            data?: {
              id?: string;
              attributes?: { checkout_url?: string };
            };
          };
          const checkoutUrl = providerBody.data?.attributes?.checkout_url;
          const checkoutSessionId = providerBody.data?.id;

          if (!paymongoResponse.ok || !checkoutUrl || !checkoutSessionId) {
            console.error('[PayMongo] Checkout session creation failed:', paymongoResponse.status, providerBody);
            await updateWebsiteRecord<PayMongoOrder>(
              WEBSITE_DATA_KEYS.paymongoOrders,
              orderId,
              (current) => ({
                ...current,
                status: 'failed',
                updatedAt: new Date().toISOString(),
              }),
              playfabSecret,
            );
            return Response.json(
              { error: 'PayMongo could not start the checkout. Please try again.' },
              { status: 502 },
            );
          }

          const activated = await updateWebsiteRecord<PayMongoOrder>(
            WEBSITE_DATA_KEYS.paymongoOrders,
            orderId,
            (current) => ({
              ...current,
              checkoutSessionId,
              status: current.status === 'fulfilled' ? 'fulfilled' : 'active',
              updatedAt: new Date().toISOString(),
            }),
            playfabSecret,
          );

          if (!activated) {
            console.error('[PayMongo] Created checkout but could not activate order:', orderId);
            return Response.json(
              { error: 'The checkout could not be recorded. Please try again.' },
              { status: 500 },
            );
          }

          return Response.json({ success: true, checkoutUrl, orderId });
        } catch (error) {
          console.error('[API] PayMongo checkout error:', error);
          return Response.json(
            { error: 'PayMongo checkout could not be started. Please try again.' },
            { status: 500 },
          );
        }
      },
    },
  },
});
