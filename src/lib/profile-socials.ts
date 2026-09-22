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
          ? segments.find((segment) => segment.startsWith("@")) ?? segments[segments.length - 1]
          : segments[segments.length - 1];
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