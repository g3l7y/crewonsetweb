import { PLAYFAB_API_BASE } from "@/lib/playfab/config";
import type { SessionData } from "@/lib/playfab/types";
import { isValidEmail } from "@/lib/validation";
import { findEmailLoginAlias, isEmailLoginIdentityStoreConfigured } from "@/lib/playfab/email-login-identities";

type PlayFabAccountInfo = {
  PlayFabId?: string;
  Username?: string;
  PrivateInfo?: { Email?: string };
  TitleInfo?: { DisplayName?: string };
  AccountInfo?: PlayFabAccountInfo;
};

type PlayFabResult = {
  code?: number;
  errorCode?: number;
  errorMessage?: string;
  data?: {
    UserInfo?: PlayFabAccountInfo;
    AccountInfo?: PlayFabAccountInfo;
    InfoResultPayload?: { AccountInfo?: PlayFabAccountInfo };
    PlayFabId?: string;
    Data?: Record<string, { Value?: string } | undefined>;
  };
};

export type PlayFabAccountLookup = {
  playFabId: string;
  username?: string;
  email?: string;
  displayName?: string;
};

async function request(path: string, body: Record<string, unknown>, headers: Record<string, string>) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as PlayFabResult;
  return { response, result };
}

function accountFromResult(result: PlayFabResult): PlayFabAccountLookup | null {
  const raw = result.data?.UserInfo ?? result.data?.AccountInfo ?? result.data?.InfoResultPayload?.AccountInfo;
  const account = raw?.AccountInfo ?? raw;
  const playFabId = String(account?.PlayFabId ?? "");
  if (!playFabId) return null;

  return {
    playFabId,
    ...(typeof account?.Username === "string" ? { username: account.Username } : {}),
    ...(typeof account?.PrivateInfo?.Email === "string" ? { email: account.PrivateInfo.Email.trim().toLowerCase() } : {}),
    ...(typeof account?.TitleInfo?.DisplayName === "string" ? { displayName: account.TitleInfo.DisplayName } : {}),
  };
}

/**
 * Resolve a PlayFab account with the server-only lookup API. This is used for
 * duplicate checks and to recover the actual PlayFab username when a title
 * display name has been changed.
 */
export async function findPlayFabAccountByIdentifier(identifier: string): Promise<PlayFabAccountLookup | null> {
  const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
  if (!secretKey) throw new Error("Server credential validation is not configured: PLAYFAB_SECRET_KEY is missing.");

  const value = identifier.trim();
  let body: Record<string, string>;
  if (isValidEmail(value)) {
    const alias = isEmailLoginIdentityStoreConfigured() ? await findEmailLoginAlias(value) : null;
    body = alias ? { PlayFabId: alias.playfab_id } : { Email: value.toLowerCase() };
  } else {
    body = { TitleDisplayName: value };
  }
  const { response, result } = await request("/Admin/GetUserAccountInfo", body, { "X-SecretKey": secretKey });
  if (!response.ok || result.code !== 200) return null;
  return accountFromResult(result);
}

export type PlayFabLoginResolution = {
  account: PlayFabAccountLookup;
  profileMetadata: { username?: string; email?: string };
};

/**
 * Resolve either the current PlayFab username/title display name or email to
 * the account's canonical PlayFab username. This lets the website honor the
 * app's renamed credential while still authenticating the password with
 * PlayFab itself.
 */
export async function resolvePlayFabLogin(identifier: string): Promise<PlayFabLoginResolution | null> {
  const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
  if (!secretKey) return null;

  const value = identifier.trim();
  let candidates: Array<Record<string, string>>;
  if (isValidEmail(value)) {
    const alias = isEmailLoginIdentityStoreConfigured() ? await findEmailLoginAlias(value) : null;
    candidates = alias ? [{ PlayFabId: alias.playfab_id }] : [{ Email: value.toLowerCase() }];
  } else {
    candidates = [{ TitleDisplayName: value }, { Username: value }];
  }

  let account: PlayFabAccountLookup | null = null;
  for (const candidate of candidates) {
    const { response, result } = await request("/Admin/GetUserAccountInfo", candidate, { "X-SecretKey": secretKey });
    if (response.ok && result.code === 200) {
      account = accountFromResult(result);
      if (account) break;
    }
  }
  if (!account) return null;

  const userData = await request("/Server/GetUserData", {
    PlayFabId: account.playFabId,
    Keys: ["profile_metadata"],
  }, { "X-SecretKey": secretKey });
  let profileMetadata: { username?: string; email?: string } = {};
  const rawMetadata = userData.result.data?.Data?.["profile_metadata"]?.Value;
  if (userData.response.ok && userData.result.code === 200 && typeof rawMetadata === "string") {
    try {
      const parsed = JSON.parse(rawMetadata) as { username?: unknown; email?: unknown };
      profileMetadata = {
        ...(typeof parsed.username === "string" ? { username: parsed.username.trim() } : {}),
        ...(typeof parsed.email === "string" ? { email: parsed.email.trim().toLowerCase() } : {}),
      };
    } catch {
      // Malformed optional metadata should not prevent the normal PlayFab login.
    }
  }

  return { account, profileMetadata };
}
/**
 * Re-authenticate the current PlayFab account before accepting a sensitive
 * credential change. The browser never receives or stores the password.
 */
export async function verifyPlayFabCurrentPassword(session: SessionData, password: string): Promise<boolean> {
  if (!password || !session.playFabId) return false;

  const identifiers: Array<{ kind: "username" | "email"; value: string }> = [];
  if (session.playFabUsername) identifiers.push({ kind: "username", value: session.playFabUsername });
  if (session.username && session.username !== session.playFabUsername) {
    identifiers.push({ kind: "username", value: session.username });
  }
  if (session.email) identifiers.push({ kind: "email", value: session.email });

  const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
  if (secretKey) {
    try {
      const account = await findPlayFabAccountByPlayFabId(session.playFabId, secretKey);
      if (account?.username) identifiers.unshift({ kind: "username", value: account.username });
      if (account?.email) identifiers.push({ kind: "email", value: account.email });
    } catch {
      // Fall back to the identifiers in the authenticated session below.
    }
  }

  const seen = new Set<string>();
  for (const identifier of identifiers) {
    const key = `${identifier.kind}:${identifier.value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const path = identifier.kind === "email" ? "/Client/LoginWithEmailAddress" : "/Client/LoginWithPlayFab";
    const body = identifier.kind === "email"
      ? { Email: identifier.value, Password: password }
      : { Username: identifier.value, Password: password };
    try {
      const { response, result } = await request(path, body, {});
      if (response.ok && result.code === 200 && result.data?.PlayFabId === session.playFabId) return true;
    } catch {
      // Try the next canonical identifier. A bad password is intentionally
      // indistinguishable from a failed identifier lookup.
    }
  }

  return false;
}

async function findPlayFabAccountByPlayFabId(playFabId: string, secretKey: string) {
  const { response, result } = await request("/Server/GetUserAccountInfo", { PlayFabId: playFabId }, { "X-SecretKey": secretKey });
  if (!response.ok || result.code !== 200) return null;
  return accountFromResult(result);
}
