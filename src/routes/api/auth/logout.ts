import { createFileRoute } from '@tanstack/react-router';
import { clearSessionCookies } from '@/lib/playfab/session';

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async () => {
        const headers = new Headers({ 'Content-Type': 'application/json' });
        for (const cookie of clearSessionCookies()) {
          headers.append('Set-Cookie', cookie);
        }
        return new Response(JSON.stringify({ success: true }), { headers });
      },
    },
  },
});
