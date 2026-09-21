import { createFileRoute } from '@tanstack/react-router';
import { validateSessionFromRequest } from '@/lib/playfab/session';

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
        return new Response(JSON.stringify({
          session: {
            playFabId: session.playFabId,
            role: session.role,
            username: session.username || session.displayName,
            displayName: session.displayName,
            email: session.email,
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
