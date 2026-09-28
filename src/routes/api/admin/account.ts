import { createFileRoute } from '@tanstack/react-router';
import { isMockMode, PLAYFAB_API_BASE } from '@/lib/playfab/config';
import { findPlayFabAccountByIdentifier, verifyPlayFabCurrentPassword } from '@/lib/playfab/credential-verification';
import { getMockAccountBySessionTicket, updateMockAccountUsername } from '@/lib/playfab/mock-accounts';
import { createSessionCookies, unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import { isValidUsername, USERNAME_ERROR } from '@/lib/validation';
import { PLAYFAB_DATA_KEYS } from '@/lib/playfab/constants';

type PlayFabResult = {
  code?: number;
  errorMessage?: string;
  data?: { Data?: Record<string, { Value?: string } | undefined> };
};

async function serverRequest(path: string, body: Record<string, unknown>, secretKey: string) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SecretKey': secretKey },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as PlayFabResult;
  if (!response.ok || result.code !== 200) throw new Error(result.errorMessage ?? 'PlayFab could not save the administrator username.');
  return result.data;
}

export const Route = createFileRoute('/api/admin/account')({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const session = await validateSessionFromRequest(request, { requireAdmin: true });
        if (!session?.sessionTicket || !session.playFabId) return unauthorizedSessionResponse();

        const body = await request.json().catch(() => ({})) as { username?: string; email?: string; currentPassword?: string };
        if (body.email) return Response.json({ success: false, error: 'Email changes require verification from the current email. Use the email-change link in Settings.' }, { status: 400 });
        const username = body.username?.trim() ?? '';
        if (!isValidUsername(username)) return Response.json({ success: false, error: USERNAME_ERROR }, { status: 400 });
        if (!body.currentPassword) return Response.json({ success: false, error: 'Enter your current password before changing the administrator username.' }, { status: 400 });

        if (isMockMode()) {
          const account = getMockAccountBySessionTicket(session.sessionTicket);
          if (!account || account.role !== 'admin') return unauthorizedSessionResponse();
          if (account.password !== body.currentPassword) return Response.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
          const updated = updateMockAccountUsername(session.sessionTicket, username);
          if (!updated.success) return Response.json(updated, { status: 409 });
          const updatedAccount = getMockAccountBySessionTicket(session.sessionTicket);
          const headers = new Headers({ 'Content-Type': 'application/json' });
          for (const cookie of createSessionCookies({ ...session, username: updatedAccount?.username ?? username, displayName: updatedAccount?.displayName ?? username })) headers.append('Set-Cookie', cookie);
          return new Response(JSON.stringify({ success: true, username: updatedAccount?.username ?? username }), { headers });
        }

        try {
          if (!(await verifyPlayFabCurrentPassword(session, body.currentPassword))) {
            return Response.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
          }
          const existing = await findPlayFabAccountByIdentifier(username);
          if (existing && existing.playFabId !== session.playFabId) {
            return Response.json({ success: false, error: 'That username is already in use. Please choose another.' }, { status: 409 });
          }
          const secretKey = process.env['PLAYFAB_SECRET_KEY']?.trim();
          if (!secretKey) return Response.json({ success: false, error: 'Administrator account updates are not configured.' }, { status: 503 });

          const userData = await serverRequest('/Server/GetUserData', { PlayFabId: session.playFabId, Keys: [PLAYFAB_DATA_KEYS.profile_metadata] }, secretKey);
          const raw = userData?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          let metadata: Record<string, unknown> = {};
          if (typeof raw === 'string') {
            try { metadata = JSON.parse(raw) as Record<string, unknown>; } catch { metadata = {}; }
          }
          const updatedMetadata = { ...metadata, username };
          await serverRequest('/Server/UpdateUserData', {
            PlayFabId: session.playFabId,
            Data: { [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify(updatedMetadata) },
          }, secretKey);
          const displayResponse = await fetch(`${PLAYFAB_API_BASE}/Client/UpdateUserTitleDisplayName`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Authorization': session.sessionTicket },
            body: JSON.stringify({ DisplayName: username }),
          });
          const displayResult = await displayResponse.json().catch(() => ({})) as PlayFabResult;
          if (!displayResponse.ok || displayResult.code !== 200) {
            await serverRequest('/Server/UpdateUserData', {
              PlayFabId: session.playFabId,
              Data: { [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify(metadata) },
            }, secretKey).catch(() => undefined);
            throw new Error(displayResult.errorMessage ?? 'PlayFab could not save the administrator username.');
          }

          const headers = new Headers({ 'Content-Type': 'application/json' });
          for (const cookie of createSessionCookies({ ...session, username, displayName: username })) headers.append('Set-Cookie', cookie);
          return new Response(JSON.stringify({ success: true, username }), { headers });
        } catch (error) {
          console.error('[API] PATCH admin/account error:', error);
          return Response.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update the administrator username.' }, { status: 400 });
        }
      },
    },
  },
});
