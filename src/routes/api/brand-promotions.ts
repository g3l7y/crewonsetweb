import { createFileRoute } from '@tanstack/react-router';
import { WEBSITE_DATA_KEYS, getWebsiteRecords } from '@/lib/playfab/websiteData';
import type { PartnershipApplication } from '@/lib/playfab/types';

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

export const Route = createFileRoute('/api/brand-promotions')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get('token')?.trim();
        if (!token) return Response.json({ error: 'Promotion access token is required.' }, { status: 400 });
        try {
          const applications = await getWebsiteRecords<PartnershipApplication>(
            WEBSITE_DATA_KEYS.partnerships,
            getSecretKey(),
          );
          const application = applications.find((item) => item.brandPromotionToken === token);
          if (!application || !['On-going', 'Done'].includes(application.status)) {
            return Response.json({ error: 'Promotion not found or not available.' }, { status: 404 });
          }
          const startDate = application.promotionStartedAt || application.paymentPaidAt || application.submittedAt;
          const endDate = application.promotionEndsAt || calculatePromotionEnd(startDate, application.duration, application.durationUnit);
          const source = application as PartnershipApplication & Record<string, unknown>;
          return Response.json({
            success: true,
            data: {
              id: application.id,
              brand: application.brand,
              exactModel: application.exactModel,
              productType: application.productType,
              description: application.description,
              link: application.link,
              status: application.status,
              startDate,
              endDate,
              placement: String(source['placement'] || 'Crew On Set production placement'),
              performance: {
                clicks: Number(source['adClicks'] || 0),
                visits: Number(source['adVisits'] || 0),
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