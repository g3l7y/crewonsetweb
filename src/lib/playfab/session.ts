import { PLAYFAB_SESSION_COOKIE, PLAYFAB_ROLE_COOKIE } from '@/lib/session.constants';
import type { SessionData } from './types';
import { isMockMode, PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from './config';
import { PLAYFAB_DATA_KEYS } from './constants';
import { getMockAccountBySessionTicket } from './mock-accounts';

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
  return Response.json({ error: 'Unauthorized' }, { status });
}

/**
 * Parse session from request cookies.
 * Returns null if no valid session found.
 */
export function parseSessionFromRequest(request: Request): SessionData | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...rest] = c.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    })
  );

  const sessionCookie = cookies[PLAYFAB_SESSION_COOKIE];
  if (!sessionCookie) return null;

  try {
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
    if (!account || (options.requireAdmin && account.role !== 'admin')) return null;
    return account;
  }

  try {
    let accountResponse: Response | null = null;
    let accountResult: any = null;
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
        accountResult = await accountResponse.json();
      } catch (error) {
        if (attempt === 1) throw error;
        continue;
      }

      const retryable = accountResponse.status === 429 || accountResponse.status >= 500 || accountResult?.code >= 500;
      if (!retryable || attempt === 1) break;
    }

    if (!accountResponse) return null;
    if (!accountResponse.ok || accountResult.code !== 200) {
      // A temporary PlayFab/network failure must not erase a valid browser
      // session. The ticket is still the credential used for every protected
      // PlayFab request. Admin requests remain fail-closed because their role
      // must be checked against the server-side tag on every request.
      const errorText = String(accountResult?.error ?? accountResult?.errorMessage ?? '').toLowerCase();
      const definitelyInvalid = accountResponse.status === 401 || accountResponse.status === 403 ||
        /not.?authenticated|invalid.?session|session.?ticket/.test(errorText);
      if (!options.requireAdmin && !definitelyInvalid) return parsed;
      return null;
    }

    const account = accountResult.data?.AccountInfo;
    const playFabId = account?.PlayFabId;
    if (!playFabId) return null;

    const secretKey = process.env['PLAYFAB_SECRET_KEY'];
    if (secretKey) {
      try {
        if (await hasActivePlayFabBan(playFabId, secretKey)) return null;
      } catch {
        // Real-mode moderation must fail closed when ban status cannot be verified.
        return null;
      }
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
    const accountDisplayName = account?.TitleInfo?.DisplayName || account?.Username || '';
    if (accountDisplayName === 'Player' || !accountDisplayName) {
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
          const metadata = JSON.parse(rawMetadata) as { username?: unknown };
          if (typeof metadata.username === 'string' && metadata.username.trim()) {
            savedUsername = metadata.username.trim();
          }
        }
      } catch {
        // Profile metadata is optional; keep the PlayFab account name if it is unavailable.
      }
    }

    const resolvedUsername = savedUsername || accountDisplayName || 'Player';
    return {
      playFabId,
      sessionTicket: parsed.sessionTicket,
      role,
      username: resolvedUsername,
      playFabUsername: account?.Username || parsed.playFabUsername,
      displayName: resolvedUsername,
      email: account?.PrivateInfo?.Email || '',
    };
  } catch {
    // Do not turn a short PlayFab outage into an apparent logout for players.
    // Admin authorization still fails closed when the role cannot be checked.
    return options.requireAdmin ? null : parsed;
  }
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  return (await validateSessionFromRequest(request, { requireAdmin: true }))?.role === 'admin';
}
