import { createFileRoute } from "@tanstack/react-router";
import { getBrandUpdateMetrics } from "@/lib/brand-update-tracking";
import { getWebsiteRecords } from "@/lib/playfab/websiteData";

type CompletedBrandUpdate = {
  id: string;
  durationDays?: number;
  expiresAt?: string;
};

type PromotionForecast = {
  sampleSize: number;
  clicks: { min: number; max: number };
  visits: { min: number; max: number };
};

type CampaignMetrics = {
  durationDays: number;
  clicks: number;
  visits: number;
};

function observedRange(values: number[]) {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export const Route = createFileRoute("/api/brand-promotions/forecast")({
  server: {
    handlers: {
      GET: async () => {
        const secret = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secret) return Response.json({ available: false, sampleSize: 0 });

        try {
          const records = await getWebsiteRecords<CompletedBrandUpdate>(
            "website_admin_brand_updates",
            secret,
          );
          const completed = records.filter((record) => {
            const duration = Number(record.durationDays);
            const expiry = record.expiresAt ? new Date(record.expiresAt).getTime() : NaN;
            return Number.isFinite(duration) && duration > 0 && Number.isFinite(expiry) && expiry < Date.now();
          }).sort((left, right) =>
            new Date(right.expiresAt!).getTime() - new Date(left.expiresAt!).getTime(),
          ).slice(0, 30);
          const campaigns = await Promise.all(completed.map(async (record) => {
            const metrics = await getBrandUpdateMetrics(record.id);
            if (metrics.impressions < 1) return null;
            return {
              durationDays: Number(record.durationDays),
              clicks: metrics.clicks,
              visits: metrics.visits,
            };
          }));
          const measured = campaigns.filter((campaign): campaign is CampaignMetrics => campaign !== null);
          const forecasts: Record<string, PromotionForecast> = {};
          for (const durationDays of [7, 14, 30]) {
            const matchingPackageCampaigns = measured.filter((campaign) => campaign.durationDays === durationDays);
            if (matchingPackageCampaigns.length < 3) continue;
            forecasts[String(durationDays)] = {
              sampleSize: matchingPackageCampaigns.length,
              clicks: observedRange(matchingPackageCampaigns.map((campaign) => campaign.clicks)),
              visits: observedRange(matchingPackageCampaigns.map((campaign) => campaign.visits)),
            };
          }
          return Response.json({ available: Object.keys(forecasts).length > 0, forecasts }, { headers: { "Cache-Control": "public, max-age=300" } });
        } catch (error) {
          console.error("[Brand promotion forecast] Could not calculate estimates", error);
          return Response.json({ available: false, sampleSize: 0 });
        }
      },
    },
  },
});
