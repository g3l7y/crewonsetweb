/** Match explicit references and legacy published links without touching unrelated brands. */
export function relatedBrandRecord(record: Record<string, unknown>, application: Record<string, unknown>, updateIds: string[] = []): boolean {
  const id = String(application.id || "");
  if ([record.applicationId, record.entityId, record.id].includes(id)) return true;
  const links = [record.url, record.href, record.link].filter((value): value is string => typeof value === "string");
  if (links.some((link) => {
    try {
      const url = new URL(link, "https://local.invalid");
      return Boolean(application.brandPromotionToken && url.searchParams.get("token") === application.brandPromotionToken)
        || updateIds.some((updateId) => url.pathname === `/api/brand-updates/${encodeURIComponent(updateId)}/click`)
        || Boolean(application.link && link === application.link);
    } catch { return false; }
  })) return true;
  return updateIds.some((updateId) => record.id === `brand-notice-${updateId}` || record.id === updateId);
}

/** Used only for explicit cleanup when the application collection is empty. */
export function isBrandNotice(record: Record<string, unknown>): boolean {
  if (["brand", "advertisement", "partnership", "ads"].includes(String(record.kind || record.type || "").toLowerCase())) return true;
  if (/^(brand-notice-|brand-update-)/.test(String(record.id || ""))) return true;
  if ([record.href, record.url, record.link].some((value) => typeof value === "string" && /\/api\/brand-(updates|promotions)\//.test(value))) return true;
  return /\b(brand|advertisement|advertising|partnership)\b/i.test(String(record.title || record.label || ""));
}
