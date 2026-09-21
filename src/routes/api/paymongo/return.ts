import { createFileRoute } from '@tanstack/react-router';
import { createSessionCookies } from '@/lib/playfab/session';
import { isMockMode } from '@/lib/playfab/config';
import { getMockAccountByPlayFabId } from '@/lib/playfab/mock-accounts';
import { getPayMongoOrder } from '@/lib/paymongo/ledger';

export const Route = createFileRoute('/api/paymongo/return')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const reference = url.searchParams.get('reference')?.trim() ?? '';
        const payment = url.searchParams.get('payment') === 'cancelled' ? 'cancelled' : 'success';
        const destination = new URL('/portal/shop', url.origin);
        destination.searchParams.set('payment', payment);
        if (reference) destination.searchParams.set('reference', reference);

        if (isMockMode() && reference) {
          try {
            const order = await getPayMongoOrder(reference);
            const account = order ? getMockAccountByPlayFabId(order.playFabId) : null;
            if (account) {
              const headers = new Headers({
                Location: destination.toString(),
                'Cache-Control': 'no-store',
              });
              for (const cookie of createSessionCookies(account)) {
                headers.append('Set-Cookie', cookie);
              }
              return new Response(null, { status: 303, headers });
            }
          } catch (error) {
            console.error('[PayMongo] Could not restore the mock payment session:', error);
          }
        }

        return Response.redirect(destination.toString(), 303);
      },
    },
  },
});