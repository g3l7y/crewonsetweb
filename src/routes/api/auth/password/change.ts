import { createFileRoute } from "@tanstack/react-router";
import { isMockMode } from "@/lib/playfab/config";
import { updateMockAccountPassword, getMockAccountBySessionTicket } from "@/lib/playfab/mock-accounts";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { isValidPassword, PASSWORD_ERROR } from "@/lib/validation";
import { verifyPlayFabCurrentPassword } from "@/lib/playfab/credential-verification";
import { sendPlayFabRecoveryEmail } from "@/lib/playfab/password-recovery-email";

export const Route = createFileRoute("/api/auth/password/change")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket) return Response.json({ success: false, error: "You must be signed in." }, { status: 401 });
        const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
        const currentPassword = body.currentPassword ?? "";
        const newPassword = body.newPassword ?? "";
        if (!isValidPassword(newPassword)) return Response.json({ success: false, error: PASSWORD_ERROR }, { status: 400 });

        if (isMockMode()) {
          const account = getMockAccountBySessionTicket(session.sessionTicket);
          if (!account || account.password !== currentPassword) return Response.json({ success: false, error: "Current password is incorrect." }, { status: 400 });
          updateMockAccountPassword(session.sessionTicket, newPassword);
          return Response.json({ success: true });
        }

        if (!(await verifyPlayFabCurrentPassword(session, currentPassword))) {
          return Response.json({ success: false, error: "Current password is incorrect." }, { status: 401 });
        }
        const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        const email = session.email?.trim().toLowerCase();
        if (!secretKey || !email || !session.playFabId) {
          return Response.json({ success: false, error: "Secure password change is unavailable because this account does not have a configured recovery email." }, { status: 503 });
        }
        try {
          await sendPlayFabRecoveryEmail(session.playFabId, email, secretKey);
          return Response.json({
            success: true,
            recoveryRequired: true,
            message: `A secure password reset link was sent to ${email}. Follow it to finish changing your password.`,
          });
        } catch (error) {
          return Response.json({ success: false, error: error instanceof Error ? error.message : "Unable to send the secure password reset email." }, { status: 502 });
        }
      },
    },
  },
});
