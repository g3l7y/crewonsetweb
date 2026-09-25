export type SocialPlatform = "twitter" | "instagram" | "youtube" | "facebook" | "linkedin";

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

function platformFromValue(platform: SocialPlatform | string): SocialPlatform {
  const value = platform.toLowerCase();
  if (value === "x" || value === "twitter") return "twitter";
  if (value === "instagram") return "instagram";
  if (value === "youtube") return "youtube";
  if (value === "facebook") return "facebook";
  return "linkedin";
}

const allowedHosts: Record<SocialPlatform, string[]> = {
  twitter: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"],
  facebook: ["facebook.com", "www.facebook.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
};

function safeSocialUrl(value: string, platform: SocialPlatform): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!allowedHosts[platform].includes(url.hostname.toLowerCase())) return null;
    url.protocol = "https:";
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

/** Preserve a real account/channel URL when supplied, or store a normalized handle. */
export function normalizeSocialProfile(value: string | undefined, platform: SocialPlatform | string): string {
  const input = value?.trim() ?? "";
  if (!input) return "";
  const normalizedPlatform = platformFromValue(platform);
  const looksLikeUrl = /^https?:\/\//i.test(input) || /^(?:(?:www|m)\.)?(?:x|twitter|instagram|youtube|facebook|linkedin)\.com\//i.test(input) || /^(?:www\.)?youtu\.be\//i.test(input);
  if (looksLikeUrl) return safeSocialUrl(input, normalizedPlatform) ?? "";
  return normalizeSocialUsername(input, normalizedPlatform);
}

/** Convert a social input or an older saved URL into its username form. */
export function normalizeSocialUsername(value: string | undefined, platform: SocialPlatform | string): string {
  let input = value?.trim() ?? "";
  if (!input) return "";

  const normalizedPlatform = platformFromValue(platform);
  const looksLikeUrl = /^https?:\/\//i.test(input) || /^(www\.|(?:x|twitter|instagram|youtube|facebook|linkedin)\.com\/)/i.test(input);
  if (looksLikeUrl) {
    try {
      const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        input = normalizedPlatform === "youtube"
          ? segments.find((segment) => segment.startsWith("@")) ?? segments[segments.length - 1] ?? input
          : segments[segments.length - 1] ?? input;
      }
    } catch {
      input = input.split("/").filter(Boolean).pop() ?? input;
    }
  }

  return input
    .replace(/^@+/, "")
    .replace(/[?#].*$/, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/** Build the public profile URL from a saved username. */
export function getSocialProfileUrl(platform: SocialPlatform | string, value: string | undefined): string {
  const normalizedPlatform = platformFromValue(platform);
  const raw = value?.trim() ?? "";
  const looksLikeUrl = /^https?:\/\//i.test(raw) || /^(?:(?:www|m)\.)?(?:x|twitter|instagram|youtube|facebook|linkedin)\.com\//i.test(raw) || /^(?:www\.)?youtu\.be\//i.test(raw);
  if (looksLikeUrl) return safeSocialUrl(raw, normalizedPlatform) ?? "#";
  const username = normalizeSocialUsername(value, normalizedPlatform);
  if (!username) return "#";

  const encodedUsername = encodeURIComponent(username);
  switch (normalizedPlatform) {
    case "twitter":
      return `https://x.com/${encodedUsername}`;
    case "instagram":
      return `https://www.instagram.com/${encodedUsername}`;
    case "youtube":
      return `https://www.youtube.com/@${encodedUsername}`;
    case "facebook":
      return `https://www.facebook.com/${encodedUsername}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${encodedUsername}`;
  }
}

export function formatSocialUsername(platform: SocialPlatform | string, value: string | undefined): string {
  const username = normalizeSocialUsername(value, platform);
  return username ? `@${username}` : "";
}
