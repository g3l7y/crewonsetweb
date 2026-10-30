import { createFileRoute } from '@tanstack/react-router';
import { validateSessionFromRequest, clearSessionCookies, forgetVerifiedSession } from '@/lib/playfab/session';
import { verifyPlayFabCurrentPassword } from '@/lib/playfab/credential-verification';
import { isMockMode, PLAYFAB_API_BASE } from '@/lib/playfab/config';
import { getMockAccountBySessionTicket, removeMockAccount } from '@/lib/playfab/mock-accounts';
import { deletePlayerEmailIdentity } from '@/lib/playfab/email-login-identities';
import { sendAccountDeletionEmail } from '@/lib/account-email';
export const Route = createFileRoute('/api/auth/delete-account')({ server: { handlers: {
POST: async ({ request }) => {
  const session = await validateSessionFromRequest(request);
  if (!session?.sessionTicket || session.role !== 'player') return Response.json({ error: 'Please sign in as a player.' }, { status: 401 });
  const { password, confirmation } = await request.json();
  if (typeof password !== 'string' || confirmation !== 'DELETE') return Response.json({ error: 'Enter your password and type DELETE.' }, { status: 400 });
  const mock = isMockMode();
  const account = mock ? getMockAccountBySessionTicket(session.sessionTicket) : null;
  if (!(mock ? account?.password === password : await verifyPlayFabCurrentPassword(session, password))) return Response.json({ error: 'Incorrect password.' }, { status: 403 });
  try {
    if (mock) removeMockAccount(session.sessionTicket);
    else {
      const secret = process.env['PLAYFAB_SECRET_KEY'];
      if (!secret) throw new Error('Account deletion is not configured.');
      const response = await fetch(`${PLAYFAB_API_BASE}/Admin/DeleteMasterPlayerAccount`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SecretKey': secret }, body: JSON.stringify({ PlayFabId: session.playFabId }) });
      const result = await response.json();
      if (!response.ok || result.code !== 200) throw new Error('Account deletion could not be completed. Please try again.');
      await deletePlayerEmailIdentity(session.playFabId).catch(console.error);
    }
    forgetVerifiedSession(session.sessionTicket);
    let emailSent = false;
    if (session.email) {
      try { await sendAccountDeletionEmail(session.email, session.username || 'Player'); emailSent = true; }
      catch (error) { console.error('Account deletion email failed:', error); }
    }
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    for (const cookie of clearSessionCookies()) headers.append('Set-Cookie', cookie);
    return Response.json({ success: true, emailSent }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to delete account.' }, { status: 502 }); }
}
} } });
