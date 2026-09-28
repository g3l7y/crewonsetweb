import { createFileRoute } from '@tanstack/react-router';
import { WEBSITE_DATA_KEYS, getWebsiteRecords } from '@/lib/playfab/websiteData';
import type { PartnershipApplication } from '@/lib/playfab/types';
import { getPromotionEndDate, processExpiredPromotions } from '@/lib/brand-promotion-lifecycle';
import { getBrandPromotionMetrics, isBrandPromotionTrackingConfigured } from '@/lib/brand-promotion-tracking';

function getSecretKey(): string {
  const key = process.env['PLAYFAB_SECRET_KEY'];
  if (!key) throw new Error('PLAYFAB_SECRET_KEY is not configured');
  return key;
}

export const Route = createFileRoute('/api/brand-promotions')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get('token')?.trim();
        if (!token) return Response.json({ error: 'Promotion access token is required.' }, { status: 400 });
        try {
          const secretKey = getSecretKey();
          await processExpiredPromotions(secretKey);
          const applications = await getWebsiteRecords<PartnershipApplication>(
            WEBSITE_DATA_KEYS.partnerships,
            secretKey,
          );
          const application = applications.find((item) => item.brandPromotionToken === token);
          if (!application || !['On-going', 'Done'].includes(application.status)) {
            return Response.json({ error: 'Promotion not found or not available.' }, { status: 404 });
          }
          const startDate = application.promotionStartedAt || application.paymentPaidAt || application.submittedAt;
          const scheduledEndDate = getPromotionEndDate(application);
          const endDate = application.promotionEndedAt || scheduledEndDate;
          const source = application as PartnershipApplication & Record<string, unknown>;
          const baseUrl = (process.env['PUBLIC_APP_URL']?.trim() || new URL(request.url).origin).replace(/\/$/, '');
          const trackedLink = application.brandPromotionToken
            ? baseUrl + '/api/brand-promotions/click?token=' + encodeURIComponent(application.brandPromotionToken)
            : undefined;
          const trackedMetrics = isBrandPromotionTrackingConfigured()
            ? await getBrandPromotionMetrics(application.id)
            : undefined;
          return Response.json({
            success: true,
            data: {
              id: application.id,
              brand: application.brand,
              exactModel: application.exactModel,
              productType: application.productType,
              description: application.description,
              link: application.link,
              submittedLink: application.link,
              trackedLink: application.status === 'On-going' && isBrandPromotionTrackingConfigured()
                ? trackedLink
                : undefined,
              trackingEnabled: isBrandPromotionTrackingConfigured(),
              status: application.status,
              startDate,
              endDate,
              scheduledEndDate,
              endedAt: application.promotionEndedAt,
              endReason: application.promotionEndReason,
              performance: {
                clicks: trackedMetrics?.clicks ?? Number(source['adClicks'] || 0),
                visits: trackedMetrics?.visits ?? Number(source['adVisits'] || 0),
                impressions: Number(source['adImpressions'] || 0),
                revenue: Number(source['adRevenue'] ?? application.budget ?? 0),
              },
            },
          });
        } catch (error) {
          console.error('[API] GET public brand promotion error:', error);
          return Response.json({ error: 'Promotion information is temporarily unavailable.' }, { status: 503 });
        }
      },
    },
  },
});
