import { createFileRoute } from '@tanstack/react-router';
import {
  getPartnershipPayments,
  isPartnershipCheckoutPaid,
  markPartnershipPaymentPaid,
} from '@/lib/partnership-payments';



function getSecret(name: 'PAYMONGO_SECRET_KEY' | 'PLAYFAB_SECRET_KEY'): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export const Route = createFileRoute('/api/paymongo/brand-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const reference = new URL(request.url).searchParams.get('reference')?.trim();
        if (!reference) {
          return Response.json({ error: 'A payment reference is required.' }, { status: 400 });
        }

        const playfabSecret = getSecret('PLAYFAB_SECRET_KEY');
        if (!playfabSecret) {
          return Response.json({ error: 'Payment confirmation is not configured.' }, { status: 503 });
        }

        try {
          const payments = await getPartnershipPayments(playfabSecret);
          const payment = payments.find((item) =>
            item.id === reference || item.checkoutSessionId === reference,
          );
          if (!payment) {
            return Response.json({ error: 'Payment reference not found.' }, { status: 404 });
          }

          if (payment.status === 'fulfilled') {
            return Response.json({
              success: true,
              status: 'Paid',
              amount: payment.amountInCentavos / 100,
            });
          }

          if (payment.status === 'failed') {
            return Response.json({ success: true, status: 'Failed' });
          }

          const paymongoSecret = getSecret('PAYMONGO_SECRET_KEY');
          if (!paymongoSecret) {
            return Response.json({ error: 'Payment confirmation is not configured.' }, { status: 503 });
          }

          const paid = await isPartnershipCheckoutPaid(payment, paymongoSecret);
          if (!paid) {
            return Response.json({ success: true, status: 'Pending' });
          }

          const result = await markPartnershipPaymentPaid(
            payment,
            'return:' + payment.id,
            playfabSecret,
          );
          if (!result.updated && !result.alreadyPaid) {
            return Response.json({ error: 'Payment was received but could not be recorded.' }, { status: 500 });
          }

          return Response.json({
            success: true,
            status: 'Paid',
            amount: payment.amountInCentavos / 100,
          });
        } catch (error) {
          console.error('[PayMongo] Brand payment confirmation error:', error);
          return Response.json({ error: 'Payment confirmation is temporarily unavailable.' }, { status: 503 });
        }
      },
    },
  },
});