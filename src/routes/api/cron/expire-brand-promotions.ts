import { createFileRoute } from '@tanstack/react-router';
import { processExpiredPromotions } from '@/lib/brand-promotion-lifecycle';
import { isMockMode } from '@/lib/playfab/config';

export const Route = createFileRoute('/api/cron/expire-brand-promotions')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env['CRON_SECRET']?.trim();
        if (!secret) return Response.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
        if (request.headers.get('authorization') !== 'Bearer ' + secret) {
          return Response.json({ error: 'Unauthorized.' }, { status: 401 });
        }
        if (isMockMode()) return Response.json({ success: true, skipped: 'mock mode' });
        const playFabSecret = process.env['PLAYFAB_SECRET_KEY']?.trim();
        if (!playFabSecret) return Response.json({ error: 'PLAYFAB_SECRET_KEY is not configured.' }, { status: 503 });
        try {
          const result = await processExpiredPromotions(playFabSecret);
          return Response.json({ success: true, ...result });
        } catch (error) {
          console.error('[Cron] Brand promotion expiry failed:', error);
          return Response.json({ error: 'Brand promotion expiry processing failed.' }, { status: 500 });
        }
      },
    },
  },
});
