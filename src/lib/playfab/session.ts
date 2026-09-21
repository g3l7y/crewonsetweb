import { PLAYFAB_SESSION_COOKIE, PLAYFAB_ROLE_COOKIE } from '@/lib/session.constants';
import type { SessionData } from './types';
import { isMockMode, PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from './config';
import { getMockAccountBySessionTicket } from './mock-accounts';

/**
 * Cookie builder helper.
 * Uses HttpOnly, SameSite=Strict, Path=/.
 * Secure flag added in production.
 */
function buildCookie(name: string, value: string, maxAge: number): string {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
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
  const maxAge = 60 * 60 * 8; // 8 hours
  const sessionValue = JSON.stringify({
    sessionTicket: session.sessionTicket,
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
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const cookie of clearSessionCookies()) headers.append('Set-Cookie', cookie);
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status, headers });
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
    const accountResponse = await fetch(`${PLAYFAB_API_BASE}/Client/GetAccountInfo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': parsed.sessionTicket,
      },
      body: JSON.stringify({ TitleId: PLAYFAB_TITLE_ID }),
    });
    const accountResult = await accountResponse.json();
    if (!accountResponse.ok || accountResult.code !== 200) return null;

    const account = accountResult.data?.AccountInfo;
    const playFabId = account?.PlayFabId;
    if (!playFabId) return null;

    let role: 'admin' | 'player' = 'player';
    const secretKey = process.env['PLAYFAB_SECRET_KEY'];
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
    return {
      playFabId,
      sessionTicket: parsed.sessionTicket,
      role,
      username: account?.TitleInfo?.DisplayName || account?.Username || 'Player',
      displayName: account?.TitleInfo?.DisplayName || account?.Username || 'Player',
      email: account?.PrivateInfo?.Email || '',
    };
  } catch {
    return null;
  }
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  return (await validateSessionFromRequest(request, { requireAdmin: true }))?.role === 'admin';
}
