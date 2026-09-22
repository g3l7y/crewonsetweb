/**
 * Turn a user-entered domain into a real external HTTP URL.
 * Existing records may contain `youtube.com` without a scheme, which browsers
 * otherwise resolve as a path on the current site.
 */
export function normalizeExternalHttpUrl(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
