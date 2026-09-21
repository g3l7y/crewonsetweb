function getEnvVar(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  return undefined;
}

export const PLAYFAB_TITLE_ID = getEnvVar("VITE_PLAYFAB_TITLE_ID") ?? "D4EA4";
export const PLAYFAB_API_BASE = `https://${PLAYFAB_TITLE_ID}.playfabapi.com`;
export const GOOGLE_CLIENT_ID = getEnvVar("VITE_GOOGLE_CLIENT_ID") ?? "";

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}

export function getPlayFabMode(): "mock" | "real" {
  const mode = getEnvVar("VITE_PLAYFAB_MODE");
  return (mode === "mock" ? "mock" : "real") as "mock" | "real";
}

export const PLAYFAB_MODE = getPlayFabMode();

export function isMockMode(): boolean {
  return getPlayFabMode() === "mock";
}

export function isRealMode(): boolean {
  return getPlayFabMode() === "real";
}
