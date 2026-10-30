import { PLAYFAB_SESSION_COOKIE, PLAYFAB_ROLE_COOKIE } from '@/lib/session.constants';
import type { SessionData } from './types';
import { isMockMode, PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from './config';
import { PLAYFAB_DATA_KEYS } from './constants';
import { getMockAccountBySessionTicket } from './mock-accounts';

type PlayFabSessionAccount = {
  PlayFabId?: string;
  Username?: string;
  TitleInfo?: { DisplayName?: string };
  PrivateInfo?: { Email?: string };
};

type PlayFabSessionResult = {
  code?: number;
  errorCode?: number;
  error?: string;
  errorMessage?: string;
  data?: { AccountInfo?: PlayFabSessionAccount };
};

const verifiedSessionCache = new Map<string, { expiresAt: number; session: SessionData }>();
const VERIFIED_SESSION_CACHE_MS = 10_000;

/**
 * Cookie builder helper.
 * Uses HttpOnly, SameSite=Strict, Path=/.
 * Secure flag added in production.
 */
function buildCookie(name: string, value: string, maxAge: number): string {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function expireCookie(name: string): string {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

/**
 * Create session cookies for a logged-in user.
 * Returns an array of Set-Cookie header values.
 */
export function createSessionCookies(session: SessionData): string[] {
  const maxAge = 60 * 60 * 24 * 30; // Keep the browser session for 30 days; PlayFab still validates the ticket.
  const sessionValue = JSON.stringify({
    sessionTicket: session.sessionTicket,
    playFabId: session.playFabId,
    username: session.username,
    playFabUsername: session.playFabUsername,
    displayName: session.displayName,
    email: session.email,
  });
  return [
    buildCookie(PLAYFAB_SESSION_COOKIE, sessionValue, maxAge),
  ];
}

/**
 * Clear session cookies.
 * Returns an array of Set-Cookie header values that expire both cookies.
 */
export function clearSessionCookies(): string[] {
  return [
    expireCookie(PLAYFAB_SESSION_COOKIE),
    expireCookie(PLAYFAB_ROLE_COOKIE),
  ];
}

export function unauthorizedSessionResponse(status = 403): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store, private' });
  // A denied resource request must not erase an otherwise valid login.
  // Only explicit logout owns cookie deletion; concurrent requests may also
  // have started before a new login cookie was issued.
  return Response.json({ error: 'Unauthorized' }, { status, headers });
}

/**
 * Parse session from request cookies.
 * Returns null if no valid session found.
 */
export function parseSessionFromRequest(request: Request): SessionData | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  try {
    const encodedSessionCookie = cookieHeader.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${PLAYFAB_SESSION_COOKIE}=`))
      ?.slice(PLAYFAB_SESSION_COOKIE.length + 1);
    if (!encodedSessionCookie) return null;
    const sessionCookie = decodeURIComponent(encodedSessionCookie);
    const session = JSON.parse(sessionCookie) as Partial<SessionData>;
    if (!session.sessionTicket) return null;
    return {
      playFabId: session.playFabId ?? '',
      sessionTicket: session.sessionTicket,
      role: 'player',
      username: session.username,
      playFabUsername: session.playFabUsername,
      displayName: session.displayName,
      email: session.email,
    };
  } catch {
    return null;
  }
}

/**
 * Check if request has admin role.
 */
export async function hasActivePlayFabBan(playFabId: string, secretKey: string): Promise<boolean> {
  const response = await fetch(`${PLAYFAB_API_BASE}/Server/GetUserBans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SecretKey': secretKey },
    body: JSON.stringify({ PlayFabId: playFabId }),
  });
  const result = await response.json().catch(() => ({})) as {
    code?: number;
    data?: { BanData?: Array<{ Active?: boolean; Expires?: string }> };
  };
  if (!response.ok || result.code !== 200) {
    throw new Error('PlayFab ban status could not be verified.');
  }
  return (result.data?.BanData ?? []).some((ban) => {
    if (!ban.Active) return false;
    if (!ban.Expires) return true;
    const expiresAt = Date.parse(ban.Expires);
    return Number.isNaN(expiresAt) || expiresAt > Date.now();
  });
}
export async function validateSessionFromRequest(
  request: Request,
  options: { requireAdmin?: boolean } = {},
): Promise<SessionData | null> {
  const parsed = parseSessionFromRequest(request);
  if (!parsed?.sessionTicket) return null;

  if (isMockMode()) {
    const account = getMockAccountBySessionTicket(parsed.sessionTicket);
    if (account) return options.requireAdmin && account.role !== 'admin' ? null : account;
    // Mock deployments may route signup and later requests to different
    // serverless instances. Carry the mock player's identity in the HttpOnly
    // session cookie so a fresh instance does not mistake that for logout.
    if (!options.requireAdmin && parsed.playFabId !== 'MOCK-PLAYER-001'
      && /^MOCK-PLAYER-[a-z0-9-]+$/i.test(parsed.playFabId)
      && /^mock-player-ticket-[a-z0-9-]+$/i.test(parsed.sessionTicket)) return parsed;
    return null;
  }

  const cached = verifiedSessionCache.get(parsed.sessionTicket);
  if (cached && cached.expiresAt > Date.now()) {
    if (options.requireAdmin && cached.session.role !== 'admin') return null;
    return cached.session;
  }
  if (cached) verifiedSessionCache.delete(parsed.sessionTicket);

  try {
    let accountResponse: Response | null = null;
    let accountResult: PlayFabSessionResult | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        accountResponse = await fetch(`${PLAYFAB_API_BASE}/Client/GetAccountInfo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authorization': parsed.sessionTicket,
          },
          body: JSON.stringify({}),
        });
        accountResult = await accountResponse.json() as PlayFabSessionResult;
      } catch (error) {
        if (attempt === 1) throw error;
        continue;
      }

      const retryable = accountResponse.status === 429 || accountResponse.status >= 500 || (typeof accountResult?.code === 'number' && accountResult.code >= 500);
      if (!retryable || attempt === 1) break;
    }

    if (!accountResponse || !accountResult) return options.requireAdmin ? null : parsed;
    // Do not honor a cached session when PlayFab cannot verify the account and
    // its current ban state. This keeps a banned account from using protected
    // website endpoints during a provider outage.
    if (!accountResponse.ok || accountResult.code !== 200) {
      const invalidTicket = accountResult.errorCode === 1001 || accountResult.errorCode === 1074 || accountResult.errorCode === 1100
        || /invalidsessionticket|notauthenticated|accountnotfound/i.test(accountResult.error ?? '');
      // Provider errors and request throttling should not expire a player's
      // website session. Only explicit invalid-ticket/account responses do.
      return !invalidTicket && !options.requireAdmin ? parsed : null;
    }

    const account = accountResult.data?.AccountInfo;
    const playFabId = account?.PlayFabId;
    if (!playFabId) return options.requireAdmin ? null : parsed;

    const secretKey = process.env['PLAYFAB_SECRET_KEY']?.trim();
    if (!secretKey) return options.requireAdmin ? null : parsed;
    try {
      if (await hasActivePlayFabBan(playFabId, secretKey)) return null;
    } catch {
      // Keep player sessions intact through temporary provider outages. Admin
      // authorization still fails closed because it requires fresh verification.
      return options.requireAdmin ? null : parsed;
    }

    let role: 'admin' | 'player' = 'player';
    if (options.requireAdmin && !secretKey) return null;
    if (secretKey) {
      const tagsResponse = await fetch(`${PLAYFAB_API_BASE}/Server/GetPlayerTags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-SecretKey': secretKey },
        body: JSON.stringify({ PlayFabId: playFabId }),
      });
      const tagsResult = await tagsResponse.json();
      if (!tagsResponse.ok || tagsResult.code !== 200) {
        if (options.requireAdmin) return null;
      } else {
        const tags: unknown[] = tagsResult.data?.Tags ?? [];
        if (tags.some((tag) => {
          if (typeof tag !== 'string') return false;
          const normalizedTag = tag.toLowerCase();
          return normalizedTag === 'role:admin' || normalizedTag.endsWith(':role:admin') || normalizedTag.endsWith('.role:admin');
        })) {
          role = 'admin';
        }
      }
    }

    if (options.requireAdmin && role !== 'admin') return null;

    let savedUsername = '';
    let savedEmail = '';
    const accountDisplayName = account?.TitleInfo?.DisplayName || account?.Username || '';
    try {
      const userDataResponse = await fetch(`${PLAYFAB_API_BASE}/Client/GetUserData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': parsed.sessionTicket,
        },
        body: JSON.stringify({ Keys: [PLAYFAB_DATA_KEYS.profile_metadata] }),
      });
      const userDataResult = await userDataResponse.json();
      const rawMetadata = userDataResult?.data?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
      if (typeof rawMetadata === 'string' && rawMetadata) {
        const metadata = JSON.parse(rawMetadata) as { username?: unknown; email?: unknown };
        if (typeof metadata.username === 'string' && metadata.username.trim()) savedUsername = metadata.username.trim();
        if (typeof metadata.email === 'string' && metadata.email.trim()) savedEmail = metadata.email.trim().toLowerCase();
      }
    } catch {
      // Profile metadata is optional; retain the provider/session values if it is unavailable.
    }

    const resolvedUsername = savedUsername || accountDisplayName || 'Player';
    const session: SessionData = {
      playFabId,
      sessionTicket: parsed.sessionTicket,
      role,
      username: resolvedUsername,
      playFabUsername: account?.Username || parsed.playFabUsername,
      displayName: resolvedUsername,
      // PlayFab's primary login email may remain unchanged when this app uses
      // its verified email alias flow. Prefer the current app credential.
      email: savedEmail || account?.PrivateInfo?.Email || parsed.email || '',
    };
    verifiedSessionCache.set(parsed.sessionTicket, { expiresAt: Date.now() + VERIFIED_SESSION_CACHE_MS, session });
    return session;
  } catch {
    // Do not turn a short PlayFab outage into an apparent logout for players.
    // Admin authorization still fails closed when the role cannot be checked.
    return options.requireAdmin ? null : parsed;
  }
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  return (await validateSessionFromRequest(request, { requireAdmin: true }))?.role === 'admin';
}
