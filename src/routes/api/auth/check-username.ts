import { createFileRoute } from '@tanstack/react-router';
import { isMockMode } from '@/lib/playfab/config';
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
          return Response.json({ available: true });
        }

        return Response.json({ available: !isMockUsernameTaken(username) });
      },
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session || session.role !== "player") {
          return Response.json({ success: false, error: "You must be signed in as a player." }, { status: 401 });
        }

        const body = (await request.json()) as { username?: string };
        const username = body.username?.trim() ?? "";
        if (!isValidUsername(username)) {
          return Response.json({ success: false, error: USERNAME_ERROR }, { status: 400 });
        }

        if (!isMockMode()) {
          return Response.json({ success: true });
        }

        const result = updateMockAccountUsername(session.sessionTicket ?? "", username);
        return Response.json(result, { status: result.success ? 200 : 409 });
      },
    },
  },
});
