import { createFileRoute } from '@tanstack/react-router';
import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from '@/lib/playfab/config';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';

export const Route = createFileRoute('/api/playfab/client')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            path?: string;
            body?: Record<string, unknown>;
          };
          const path = body.path ?? '';
          if (!path.startsWith('/Client/') || path.includes('Login') || path.includes('Register')) {
            return Response.json({ code: 400, errorMessage: 'Unsupported PlayFab client operation.' }, { status: 400 });
          }

          const session = await validateSessionFromRequest(request);
          if (!session?.sessionTicket) {
            return unauthorizedSessionResponse(401);
          }

          const playfabResponse = await fetch(`${PLAYFAB_API_BASE}${path}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Authorization': session.sessionTicket,
            },
            body: JSON.stringify({ ...(body.body ?? {}), TitleId: PLAYFAB_TITLE_ID }),
          });
          const result = await playfabResponse.json();
          return Response.json(result, { status: playfabResponse.status });
        } catch {
          return Response.json({ code: 500, errorMessage: 'PlayFab request failed.' }, { status: 500 });
        }
      },
    },
  },
});
