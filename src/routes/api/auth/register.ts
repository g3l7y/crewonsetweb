import { createFileRoute } from '@tanstack/react-router';
import { isMockMode, PLAYFAB_TITLE_ID } from '@/lib/playfab/config';
import { createSessionCookies } from '@/lib/playfab/session';
import { isValidPassword, isValidUsername, PASSWORD_ERROR, USERNAME_ERROR } from '@/lib/validation';
import { registerMockAccount } from '@/lib/playfab/mock-accounts';
import { syncPlayFabContactEmail } from '@/lib/playfab/contact-email';
import type { SessionData, AuthResponse } from '@/lib/playfab/types';

export const Route = createFileRoute('/api/auth/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email, password, username } = (await request.json()) as {
            email?: string;
            password?: string;
            username?: string;
          };

          const normalizedEmail = email?.trim() ?? '';
          const normalizedUsername = username?.trim() ?? '';

          if (!normalizedEmail || !password || !normalizedUsername) {
            return Response.json(
              { success: false, error: 'Email, password, and username are required.' } satisfies AuthResponse,
              { status: 400 },
            );
          }

          if (!isValidUsername(normalizedUsername)) {
            return Response.json(
              { success: false, error: USERNAME_ERROR } satisfies AuthResponse,
              { status: 400 },
            );
          }

          if (!isValidPassword(password)) {
            return Response.json(
              { success: false, error: PASSWORD_ERROR } satisfies AuthResponse,
              { status: 400 },
            );
          }

          let session: SessionData;

          if (isMockMode()) {
            const account = registerMockAccount(normalizedEmail, password, normalizedUsername);
            if (!account) {
              return Response.json(
                { success: false, error: 'That username is already in use. Please choose another.' } satisfies AuthResponse,
                { status: 409 },
              );
            }
            session = account;
          } else {
            const playfabResponse = await fetch(
              `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/RegisterPlayFabUser`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  TitleId: PLAYFAB_TITLE_ID,
                  Email: normalizedEmail,
                  Password: password,
                  Username: normalizedUsername,
                  DisplayName: normalizedUsername,
                  RequireBothUsernameAndEmail: true,
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
              displayName: normalizedUsername,
              email: normalizedEmail,
            };

            try {
              await syncPlayFabContactEmail(session.sessionTicket, normalizedEmail, {
                playFabId: session.playFabId,
                secretKey: process.env['PLAYFAB_SECRET_KEY']?.trim(),
              });
            } catch (contactEmailError) {
              console.error('[PlayFab] Could not sync registration contact email:', contactEmailError);
            }
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
              username: session.username || session.displayName,
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
