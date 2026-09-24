import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import { WEBSITE_DATA_KEYS, getWebsiteRecords } from '@/lib/playfab/websiteData';
import type { AdEntry, PartnershipApplication } from '@/lib/playfab/types';
import { getPromotionEndDate, processExpiredPromotions } from '@/lib/brand-promotion-lifecycle';
import { getBrandPromotionMetrics, isBrandPromotionTrackingConfigured } from '@/lib/brand-promotion-tracking';

function getSecretKey(): string {
  const key = process.env['PLAYFAB_SECRET_KEY'];
  if (!key) throw new Error('PLAYFAB_SECRET_KEY is not configured');
  return key;
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function toAdEntry(application: PartnershipApplication, request: Request, metrics?: { clicks: number; visits: number }): AdEntry {
  const source = application as PartnershipApplication & Record<string, unknown>;
  const startDate = application.promotionStartedAt || application.paymentPaidAt || application.submittedAt;
  const expiresAt = application.promotionEndedAt || getPromotionEndDate(application);
  const baseUrl = (process.env['PUBLIC_APP_URL']?.trim() || new URL(request.url).origin).replace(/\/$/, '');
  return {
    id: 'AD-' + application.id,
    applicationId: application.id,
    brand: application.brand,
    product: application.exactModel,
    exactModel: application.exactModel,
    productType: application.productType,
    contract: application.description || 'Crew On Set brand promotion placement.',
    impressions: numberValue(source['adImpressions']),
    clicks: metrics?.clicks ?? numberValue(source['adClicks']),
    visits: metrics?.visits ?? numberValue(source['adVisits']),
    revenue: numberValue(source['adRevenue'] ?? application.budget),
    startDate,
    endDate: expiresAt,
    expiresAt,
    submittedLink: application.link,
    trackedLink: isBrandPromotionTrackingConfigured() && application.status === 'On-going' && application.brandPromotionToken
      ? baseUrl + '/api/brand-promotions/click?token=' + encodeURIComponent(application.brandPromotionToken)
      : undefined,
    trackingEnabled: isBrandPromotionTrackingConfigured(),
    endedAt: application.promotionEndedAt,
    endReason: application.promotionEndReason,
    status: application.status === 'Done' ? 'Done' : 'On-going',
  };
}

export const Route = createFileRoute('/api/admin/ad-revenue')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          await processExpiredPromotions(getSecretKey());
          const applications = await getWebsiteRecords<PartnershipApplication>(
            WEBSITE_DATA_KEYS.partnerships,
            getSecretKey(),
          );
          const applicationId = new URL(request.url).searchParams.get('id')?.trim();
          const eligible = applications.filter((application) =>
            !application.archived && ['On-going', 'Done'].includes(application.status),
          );
          const ads = await Promise.all(eligible.map(async (application) => {
            const metrics = isBrandPromotionTrackingConfigured()
              ? await getBrandPromotionMetrics(application.id)
              : undefined;
            return toAdEntry(application, request, metrics);
          }));
          if (applicationId) {
            const ad = ads.find((item) => item.applicationId === applicationId || item.id === applicationId);
            return ad
              ? Response.json({ success: true, data: ad })
              : Response.json({ error: 'Advertisement not found.' }, { status: 404 });
          }
          return Response.json({ success: true, data: ads });
        } catch (error) {
          console.error('[API] GET ad revenue error:', error);
          return Response.json({ error: 'Failed to fetch advertisement revenue.' }, { status: 500 });
        }
      },
    },
  },
});
