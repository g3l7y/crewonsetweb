import { createFileRoute } from '@tanstack/react-router';
import { PLAYFAB_API_BASE, isMockMode } from '@/lib/playfab/config';
import { PLAYFAB_DATA_KEYS } from '@/lib/playfab/constants';
import { findPlayFabAccountByIdentifier } from '@/lib/playfab/credential-verification';
import { createSessionCookies, validateSessionFromRequest } from '@/lib/playfab/session';
import { isValidUsername, USERNAME_ERROR } from '@/lib/validation';

async function playFabClientRequest(path: string, sessionTicket: string, body: Record<string, unknown>) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Authorization': sessionTicket },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 200) throw new Error(result.errorMessage ?? 'PlayFab could not save your profile.');
  return result.data;
}

export const Route = createFileRoute('/api/auth/profile/setup')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || session.role !== 'player') {
          return Response.json({ success: false, error: 'You must be signed in as a player.' }, { status: 401 });
        }
        if (isMockMode()) {
          return Response.json({ success: false, error: 'Google profile setup is only available in real mode.' }, { status: 400 });
        }

        const body = (await request.json()) as { username?: string };
        const username = body.username?.trim() ?? '';
        if (!isValidUsername(username)) {
          return Response.json({ success: false, error: USERNAME_ERROR }, { status: 400 });
        }

        try {
          const userData = await playFabClientRequest('/Client/GetUserData', session.sessionTicket, {
            Keys: [PLAYFAB_DATA_KEYS.profile_metadata],
          });
          const rawMetadata = userData?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          let metadata: Record<string, unknown> = {};
          if (typeof rawMetadata === 'string' && rawMetadata) {
            try { metadata = JSON.parse(rawMetadata) as Record<string, unknown>; } catch { metadata = {}; }
          }
          if (typeof metadata.username === 'string' && metadata.username.trim()) {
            return Response.json({ success: false, error: 'Your profile username is already set.' }, { status: 409 });
          }

          const existing = await findPlayFabAccountByIdentifier(username);
          if (existing && existing.playFabId !== session.playFabId) {
            return Response.json({ success: false, error: 'That username is already in use. Please choose another.' }, { status: 409 });
          }

          await playFabClientRequest('/Client/UpdateUserTitleDisplayName', session.sessionTicket, { DisplayName: username });
          await playFabClientRequest('/Client/UpdateUserData', session.sessionTicket, {
            Data: {
              [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify({
                ...metadata,
                username,
                googleProfileSetup: true,
              }),
            },
          });

          const headers = new Headers({ 'Content-Type': 'application/json' });
          for (const cookie of createSessionCookies({
            ...session,
            username,
            displayName: username,
          })) headers.append('Set-Cookie', cookie);
          return new Response(JSON.stringify({ success: true, username }), { headers });
        } catch (error) {
          return Response.json({ success: false, error: error instanceof Error ? error.message : 'Unable to save your username.' }, { status: 400 });
        }
      },
    },
  },
});