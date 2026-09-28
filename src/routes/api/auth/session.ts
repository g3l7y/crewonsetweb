import { createFileRoute } from '@tanstack/react-router';
import { validateSessionFromRequest } from '@/lib/playfab/session';
import { isMockMode } from '@/lib/playfab/config';
import { getPlayFabContactEmail } from '@/lib/playfab/contact-email';

export const Route = createFileRoute('/api/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session) {
          return new Response(JSON.stringify({ session: null }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, private',
            },
          });
        }
        let email = session.email;
        if (!isMockMode() && session.sessionTicket) {
          try {
            email = (await getPlayFabContactEmail(session.sessionTicket)) ?? email;
          } catch (error) {
            console.error('[PlayFab] Could not load the session contact email:', error);
          }
        }
        return new Response(JSON.stringify({
          session: {
            playFabId: session.playFabId,
            role: session.role,
            username: session.username || session.displayName,
            displayName: session.displayName,
            email,
          },
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, private',
          },
        });
      },
    },
  },
});