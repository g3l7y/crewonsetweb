import { createFileRoute } from '@tanstack/react-router';
import { isMockMode } from '@/lib/playfab/config';
import { findPlayFabAccountByIdentifier } from '@/lib/playfab/credential-verification';
import { isMockUsernameTaken, updateMockAccountUsername } from '@/lib/playfab/mock-accounts';
import { validateSessionFromRequest } from '@/lib/playfab/session';
import { isValidUsername, USERNAME_ERROR } from '@/lib/validation';

export const Route = createFileRoute('/api/auth/check-username')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const username = new URL(request.url).searchParams.get('username')?.trim() ?? '';

        if (!isValidUsername(username)) {
          return Response.json(
            { available: false, error: USERNAME_ERROR },
            { status: 400 },
          );
        }

        if (!isMockMode()) {
          try {
            const existing = await findPlayFabAccountByIdentifier(username);
            return Response.json({ available: !existing });
          } catch (error) {
            return Response.json(
              { available: false, error: error instanceof Error ? error.message : 'Unable to verify username availability.' },
              { status: 503 },
            );
          }
        }

        return Response.json({ available: !isMockUsernameTaken(username) });
      },
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session || session.role !== 'player') {
          return Response.json({ success: false, error: 'You must be signed in as a player.' }, { status: 401 });
        }

        const body = (await request.json()) as { username?: string };
        const username = body.username?.trim() ?? '';
        if (!isValidUsername(username)) {
          return Response.json({ success: false, error: USERNAME_ERROR }, { status: 400 });
        }

        if (!isMockMode()) {
          try {
            const existing = await findPlayFabAccountByIdentifier(username);
            if (existing && existing.playFabId !== session.playFabId) {
              return Response.json({ success: false, error: 'That username is already in use. Please choose another.' }, { status: 409 });
            }
            return Response.json({ success: true });
          } catch (error) {
            return Response.json(
              { success: false, error: error instanceof Error ? error.message : 'Unable to verify username availability.' },
              { status: 503 },
            );
          }
        }

        const result = updateMockAccountUsername(session.sessionTicket ?? '', username);
        return Response.json(result, { status: result.success ? 200 : 409 });
      },
    },
  },
});