import { createFileRoute } from '@tanstack/react-router';
import { isMockMode } from '@/lib/playfab/config';
import { syncPlayFabContactEmail } from '@/lib/playfab/contact-email';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';

export const Route = createFileRoute('/api/admin/account')({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const session = await validateSessionFromRequest(request, { requireAdmin: true });
        if (!session) return unauthorizedSessionResponse();
        if (isMockMode()) return Response.json({ success: true });

        const body = (await request.json()) as { email?: string };
        const email = body.email?.trim().toLowerCase();
        const sessionTicket = session.sessionTicket;
        if (!email || !sessionTicket) return Response.json({ error: 'Email is required.' }, { status: 400 });

        try {
          await syncPlayFabContactEmail(sessionTicket, email, {
            playFabId: session.playFabId,
            secretKey: process.env['PLAYFAB_SECRET_KEY']?.trim(),
          });
          return Response.json({ success: true, email });
        } catch (error) {
          console.error('[API] PATCH admin/account error:', error);
          return Response.json(
            { error: error instanceof Error ? error.message : 'Failed to update the administrator contact email.' },
            { status: 400 },
          );
        }
      },
    },
  },
});