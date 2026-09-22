import { createFileRoute } from '@tanstack/react-router';
import { processExpiredPromotions, getPromotionEndDate } from '@/lib/brand-promotion-lifecycle';
import { isBrandPromotionTrackingConfigured, recordBrandPromotionClick } from '@/lib/brand-promotion-tracking';
import { normalizeExternalHttpUrl } from '@/lib/external-url';
import { isMockMode } from '@/lib/playfab/config';
import { WEBSITE_DATA_KEYS, getWebsiteRecords } from '@/lib/playfab/websiteData';
import type { PartnershipApplication } from '@/lib/playfab/types';

export const Route = createFileRoute('/api/brand-promotions/click')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get('token')?.trim();
        if (!token) return new Response('Promotion link is invalid.', { status: 400 });
        if (isMockMode()) return new Response('Tracked promotion links are available in real mode only.', { status: 404 });

        const secretKey = process.env['PLAYFAB_SECRET_KEY']?.trim();
        if (!secretKey) return new Response('Promotion link is temporarily unavailable.', { status: 503 });
        try {
          await processExpiredPromotions(secretKey);
          const applications = await getWebsiteRecords<PartnershipApplication>(WEBSITE_DATA_KEYS.partnerships, secretKey);
          const application = applications.find((item) => item.brandPromotionToken === token);
          if (!application || application.status !== 'On-going' || Date.now() >= new Date(getPromotionEndDate(application)).getTime()) {
            return new Response('This brand promotion has ended.', { status: 410, headers: { 'content-type': 'text/plain; charset=utf-8' } });
          }

          const destination = normalizeExternalHttpUrl(application.link);
          let destinationUrl: URL;
          try {
            destinationUrl = new URL(destination);
          } catch {
            return new Response('The submitted brand link is invalid.', { status: 422 });
          }
          if (!['http:', 'https:'].includes(destinationUrl.protocol)) {
            return new Response('The submitted brand link is invalid.', { status: 422 });
          }

          const cookieName = 'cos_brand_visitor';
          const cookies = request.headers.get('cookie') || '';
          const storedVisitor = cookies.split(';').map((cookie) => cookie.trim())
            .find((cookie) => cookie.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
          let visitorId = '';
          try {
            visitorId = storedVisitor ? decodeURIComponent(storedVisitor) : '';
          } catch {
            visitorId = '';
          }
          const hasValidVisitor = /^[0-9a-f-]{36}$/i.test(visitorId);
          if (!hasValidVisitor) visitorId = crypto.randomUUID();
          if (isBrandPromotionTrackingConfigured()) {
            try {
              await recordBrandPromotionClick(application.id, visitorId);
            } catch (error) {
              // Never strand a player on a broken tracking service; keep the submitted destination reachable.
              console.error('[Brand promotion tracking] Could not record click:', error);
            }
          }
          const headers = new Headers({ 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' });
          if (!hasValidVisitor) {
            headers.append('Set-Cookie', cookieName + '=' + encodeURIComponent(visitorId) + '; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax');
          }
          headers.set('Location', destinationUrl.toString());
          return new Response(null, { status: 302, headers });
        } catch (error) {
          console.error('[Brand promotion tracking] Redirect failed:', error);
          return new Response('The brand link is temporarily unavailable. Please try again shortly.', { status: 503 });
        }
      },
    },
  },
});
