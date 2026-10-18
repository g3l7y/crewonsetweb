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
    placement: 'Your product promotion is valid for 7 days and will be displayed during this period.',
    reporting: 'Aggregate promotion views, tracked click-throughs, and unique-browser estimates.',
  },
  {
    id: 'campaign-14-day',
    name: 'Campaign',
    durationDays: 14,
    pricePhp: 7_000,
    placement: 'Your product promotion is valid for 14 days and will be displayed during this period.',
    reporting: 'Aggregate promotion views, tracked click-throughs, and unique-browser estimates.',
  },
  {
    id: 'featured-30-day',
    name: 'Featured Campaign',
    durationDays: 30,
    pricePhp: 15_000,
    placement: 'Your product promotion is valid for 30 days and will be displayed during this period.',
    reporting: 'Aggregate promotion views, tracked click-throughs, and unique-browser estimates.',
  },
];

export const BRAND_PROMOTION_DELIVERY_TERMS =
  'Your package covers the selected display period, not a guaranteed number of clicks or visits. If a verified Crew On Set issue interrupts the promotion, we’ll add the missed days or offer a prorated refund if we can’t. Delays or problems with your materials, link, or website aren’t covered.';

export function getBrandPromotionPackage(packageId: unknown): BrandPromotionPackage | undefined {
  return typeof packageId === 'string'
    ? BRAND_PROMOTION_PACKAGES.find((promotionPackage) => promotionPackage.id === packageId)
    : undefined;
}

export function packageDailyRate(packagePricePhp: number, durationDays: number): number {
  return durationDays > 0 ? packagePricePhp / durationDays : 0;
}
