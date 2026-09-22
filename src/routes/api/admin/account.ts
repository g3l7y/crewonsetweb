import { createFileRoute } from '@tanstack/react-router';
import { isMockMode } from '@/lib/playfab/config';
import { syncPlayFabContactEmail } from '@/lib/playfab/contact-email';
import { findPlayFabAccountByIdentifier, verifyPlayFabCurrentPassword } from '@/lib/playfab/credential-verification';
import { getMockAccountBySessionTicket, updateMockAccountEmail } from '@/lib/playfab/mock-accounts';
import { createSessionCookies, unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import { EMAIL_ERROR, isValidEmail } from '@/lib/validation';

export const Route = createFileRoute('/api/admin/account')({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const session = await validateSessionFromRequest(request, { requireAdmin: true });
        if (!session?.sessionTicket) return unauthorizedSessionResponse();

        const body = (await request.json()) as { email?: string; currentPassword?: string };
        const email = body.email?.trim().toLowerCase() ?? '';
        if (!isValidEmail(email)) return Response.json({ error: EMAIL_ERROR }, { status: 400 });
        if (!body.currentPassword) {
          return Response.json({ error: 'Enter your current password before changing the administrator email.' }, { status: 400 });
        }

        if (isMockMode()) {
          const account = getMockAccountBySessionTicket(session.sessionTicket);
          if (!account || account.role !== 'admin') return unauthorizedSessionResponse();
          if (account.password !== body.currentPassword) {
            return Response.json({ error: 'Current password is incorrect.' }, { status: 401 });
          }
          const updated = updateMockAccountEmail(session.sessionTicket, email);
          if (!updated.success) return Response.json(updated, { status: 409 });
          const updatedAccount = getMockAccountBySessionTicket(session.sessionTicket);
          const headers = new Headers({ 'Content-Type': 'application/json' });
          for (const cookie of createSessionCookies({
            ...session,
            email: updatedAccount?.email ?? email,
          })) headers.append('Set-Cookie', cookie);
          return new Response(JSON.stringify({ success: true, email: updatedAccount?.email ?? email }), { headers });
        }

        try {
          if (!(await verifyPlayFabCurrentPassword(session, body.currentPassword))) {
            return Response.json({ error: 'Current password is incorrect.' }, { status: 401 });
          }

          const existing = await findPlayFabAccountByIdentifier(email);
          if (existing && existing.playFabId !== session.playFabId) {
            return Response.json({ error: 'That email is already in use. Please choose another.' }, { status: 409 });
          }

          await syncPlayFabContactEmail(session.sessionTicket, email, {
            playFabId: session.playFabId,
            secretKey: process.env['PLAYFAB_SECRET_KEY']?.trim(),
          });
          const headers = new Headers({ 'Content-Type': 'application/json' });
          for (const cookie of createSessionCookies({ ...session, email })) headers.append('Set-Cookie', cookie);
          return new Response(JSON.stringify({ success: true, email }), { headers });
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