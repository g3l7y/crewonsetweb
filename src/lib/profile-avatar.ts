// Version the default URL so browsers discard the previous built-in artwork.
export const DEFAULT_PROFILE_PICTURE_URL = "/assets/profile-default.jpg?v=20260926";

export function isManagedProfileAvatarUrl(value: unknown): value is string {
  return typeof value === "string" && value.includes("/api/playfab/profile-avatar?");
}

export function getProfileAvatarUrl(playFabId: string, version = Date.now()): string {
  return `/api/playfab/profile-avatar?playFabId=${encodeURIComponent(playFabId)}&v=${version}`;
}
