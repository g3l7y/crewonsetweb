import { createFileRoute } from '@tanstack/react-router';
import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID, isMockMode } from '@/lib/playfab/config';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';

export const Route = createFileRoute('/api/admin/account')({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const session = await validateSessionFromRequest(request, { requireAdmin: true });
        if (!session) return unauthorizedSessionResponse();
        if (isMockMode()) return Response.json({ success: true });

        const body = (await request.json()) as { email?: string };
        const email = body.email?.trim();
        const sessionTicket = session.sessionTicket;
        if (!email || !sessionTicket) return Response.json({ error: 'Email is required.' }, { status: 400 });

        try {
          const response = await fetch(`${PLAYFAB_API_BASE}/Client/AddOrUpdateContactEmail`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Authorization': sessionTicket,
            },
            body: JSON.stringify({ EmailAddress: email, TitleId: PLAYFAB_TITLE_ID }),
          });
          const result = await response.json();
          if (!response.ok || result.code !== 200) {
            return Response.json(
              { error: result.errorMessage ?? 'PlayFab rejected the email update.' },
              { status: 400 },
            );
          }
          return Response.json({ success: true, email });
        } catch (error) {
          console.error('[API] PATCH admin/account error:', error);
          return Response.json({ error: 'Failed to update the administrator email.' }, { status: 500 });
        }
      },
    },
  },
});