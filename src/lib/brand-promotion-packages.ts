export type BrandPromotionPackage = {
  id: string;
  name: string;
  durationDays: number;
  pricePhp: number;
  placement: string;
  reporting: string;
};

/** Introductory, duration-based pilot rates. Reach is reported from live data and is not guaranteed. */
export const BRAND_PROMOTION_PACKAGES: BrandPromotionPackage[] = [
  {
    id: 'pilot-7-day',
    name: 'Pilot',
    durationDays: 7,
    pricePhp: 3_500,
    placement: 'One in-game sponsored placement for 7 days.',
    reporting: 'Aggregate tracked click-throughs and unique-browser estimates.',
  },
  {
    id: 'campaign-14-day',
    name: 'Campaign',
    durationDays: 14,
    pricePhp: 7_000,
    placement: 'One in-game sponsored placement for 14 days.',
    reporting: 'Aggregate tracked click-throughs and unique-browser estimates.',
  },
  {
    id: 'featured-30-day',
    name: 'Featured Campaign',
    durationDays: 30,
    pricePhp: 15_000,
    placement: 'One in-game sponsored placement for 30 days.',
    reporting: 'Aggregate tracked click-throughs and unique-browser estimates.',
  },
];

export const BRAND_PROMOTION_DELIVERY_TERMS =
  'The package guarantees the scheduled campaign duration, not a minimum number of impressions, clicks, website visits, leads, or sales. Click-through tracking records the outbound redirect; it cannot confirm the destination site loaded. If the agreed in-game placement is unavailable because of a verified Crew On Set service issue, the affected days are added to the campaign at no charge. If replacement days cannot be delivered, the brand may request a pro-rated refund for verified undelivered days, calculated as package price × undelivered days ÷ package duration and processed manually through the original payment provider. Missing or late brand materials, an invalid destination link, or the brand website being unavailable do not count as Crew On Set placement downtime.';

export function getBrandPromotionPackage(packageId: unknown): BrandPromotionPackage | undefined {
  return typeof packageId === 'string'
    ? BRAND_PROMOTION_PACKAGES.find((promotionPackage) => promotionPackage.id === packageId)
    : undefined;
}

export function packageDailyRate(packagePricePhp: number, durationDays: number): number {
  return durationDays > 0 ? packagePricePhp / durationDays : 0;
}
