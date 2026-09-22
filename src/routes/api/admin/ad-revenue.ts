import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import { WEBSITE_DATA_KEYS, getWebsiteRecords } from '@/lib/playfab/websiteData';
import type { AdEntry, PartnershipApplication } from '@/lib/playfab/types';

function getSecretKey(): string {
  const key = process.env['PLAYFAB_SECRET_KEY'];
  if (!key) throw new Error('PLAYFAB_SECRET_KEY is not configured');
  return key;
}

function calculatePromotionEnd(startedAt: string, duration?: number, durationUnit?: string): string {
  const end = new Date(startedAt);
  const amount = Math.max(1, Math.round(Number(duration || 1)));
  if (String(durationUnit || '').toLowerCase().startsWith('month')) {
    end.setUTCMonth(end.getUTCMonth() + amount);
  } else {
    end.setUTCDate(end.getUTCDate() + amount);
  }
  return end.toISOString();
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function toAdEntry(application: PartnershipApplication): AdEntry {
  const source = application as PartnershipApplication & Record<string, unknown>;
  const startDate = application.promotionStartedAt || application.paymentPaidAt || application.submittedAt;
  const expiresAt = application.promotionEndsAt || calculatePromotionEnd(
    startDate,
    application.duration,
    application.durationUnit,
  );
  return {
    id: 'AD-' + application.id,
    applicationId: application.id,
    brand: application.brand,
    product: application.exactModel,
    exactModel: application.exactModel,
    productType: application.productType,
    contract: application.description || 'Crew On Set brand promotion placement.',
    placement: String(source['placement'] || 'Crew On Set production placement'),
    impressions: numberValue(source['adImpressions']),
    clicks: numberValue(source['adClicks']),
    visits: numberValue(source['adVisits']),
    revenue: numberValue(source['adRevenue'] ?? application.budget),
    startDate,
    endDate: expiresAt,
    expiresAt,
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
          const applications = await getWebsiteRecords<PartnershipApplication>(
            WEBSITE_DATA_KEYS.partnerships,
            getSecretKey(),
          );
          const applicationId = new URL(request.url).searchParams.get('id')?.trim();
          const eligible = applications.filter((application) =>
            !application.archived && ['Approved', 'On-going', 'Done'].includes(application.status),
          );
          const ads = eligible.map(toAdEntry);
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