import { createFileRoute } from '@tanstack/react-router';
import { isMockMode, PLAYFAB_TITLE_ID } from '@/lib/playfab/config';
import { createSessionCookies } from '@/lib/playfab/session';
import type { SessionData, AuthResponse } from '@/lib/playfab/types';

export const Route = createFileRoute('/api/auth/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email, password, displayName } = (await request.json()) as {
            email?: string;
            password?: string;
            displayName?: string;
          };

          if (!email || !password || !displayName) {
            return Response.json(
              { success: false, error: 'Email, password, and display name are required.' } satisfies AuthResponse,
              { status: 400 },
            );
          }

          if (password.length < 6) {
            return Response.json(
              { success: false, error: 'Password must be at least 6 characters.' } satisfies AuthResponse,
              { status: 400 },
            );
          }

          let session: SessionData;

          if (isMockMode()) {
            session = {
              playFabId: 'MOCK-PLAYER-' + Date.now().toString().slice(-4),
              sessionTicket: 'mock-player-ticket',
              role: 'player',
              displayName,
              email,
            };
          } else {
            const playfabResponse = await fetch(
              `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/RegisterPlayFabUser`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  TitleId: PLAYFAB_TITLE_ID,
                  Email: email,
                  Password: password,
                  DisplayName: displayName,
                  RequireBothUsernameAndEmail: false,
                }),
              },
            );

            const pfResult = await playfabResponse.json();

            if (!playfabResponse.ok || pfResult.code !== 200) {
              return Response.json(
                {
                  success: false,
                  error: pfResult.errorMessage ?? 'PlayFab registration failed.',
                } satisfies AuthResponse,
                { status: 400 },
              );
            }

            const pfData = pfResult.data;
            session = {
              playFabId: pfData.PlayFabId,
              sessionTicket: pfData.SessionTicket,
              role: 'player',
              displayName,
              email,
            };
          }

          const headers = new Headers({ 'Content-Type': 'application/json' });
          for (const cookie of createSessionCookies(session)) {
            headers.append('Set-Cookie', cookie);
          }

          const response: AuthResponse = {
            success: true,
            session: {
              playFabId: session.playFabId,
              role: session.role,
              displayName: session.displayName,
              email: session.email,
            },
            destination: '/portal',
          };

          return new Response(JSON.stringify(response), { headers });
        } catch (error) {
          console.error('[Auth] Registration error:', error);
          return Response.json(
            { success: false, error: 'An unexpected error occurred.' } satisfies AuthResponse,
            { status: 500 },
          );
        }
      },
    },
  },
});
