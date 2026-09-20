import { createFileRoute } from '@tanstack/react-router';
import { clearSessionCookies, validateSessionFromRequest } from '@/lib/playfab/session';

export const Route = createFileRoute('/api/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session) {
          const headers = new Headers({ 'Content-Type': 'application/json' });
          for (const cookie of clearSessionCookies()) headers.append('Set-Cookie', cookie);
          return new Response(JSON.stringify({ session: null }), { headers });
        }
        return Response.json({
          session: {
            playFabId: session.playFabId,
            role: session.role,
            username: session.username || session.displayName,
            displayName: session.displayName,
            email: session.email,
          },
        });
      },
    },
  },
});
