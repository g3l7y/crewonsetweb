import { createFileRoute } from '@tanstack/react-router';
import { getPayMongoOrder, isPayMongoLedgerConfigured } from '@/lib/paymongo/ledger';
import { isMockMode } from '@/lib/playfab/config';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';

export const Route = createFileRoute('/api/paymongo/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isMockMode() || !isPayMongoLedgerConfigured()) {
          return Response.json({ error: 'Mock PayMongo status is unavailable.' }, { status: 404 });
        }

        const session = await validateSessionFromRequest(request);
        if (!session) return unauthorizedSessionResponse();

        const orderId = new URL(request.url).searchParams.get('orderId')?.trim();
        if (!orderId) {
          return Response.json({ error: 'An order reference is required.' }, { status: 400 });
        }

        try {
          const order = await getPayMongoOrder(orderId);
          if (!order || order.playFabId !== session.playFabId) {
            return Response.json({ error: 'Payment order not found.' }, { status: 404 });
          }
          return Response.json({
            orderId: order.orderId,
            status: order.status,
            coins: order.coins,
            amountInCentavos: order.amountInCentavos,
          });
        } catch (error) {
          console.error('[PayMongo] Mock payment status error:', error);
          return Response.json({ error: 'Payment status is temporarily unavailable.' }, { status: 503 });
        }
      },
    },
  },
});