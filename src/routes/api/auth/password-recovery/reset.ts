import { createFileRoute } from "@tanstack/react-router";
import { isMockMode, PLAYFAB_API_BASE } from "@/lib/playfab/config";
import { consumeMockRecovery } from "@/lib/playfab/mock-password-recovery";
import { updateMockAccountPassword } from "@/lib/playfab/mock-accounts";
import { isValidPassword, PASSWORD_ERROR } from "@/lib/validation";

export const Route = createFileRoute("/api/auth/password-recovery/reset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { recoveryToken?: string; password?: string };
          const password = body.password ?? "";
          if (!isValidPassword(password)) return Response.json({ success: false, error: PASSWORD_ERROR }, { status: 400 });

          if (isMockMode()) {
            const recovery = body.recoveryToken ? consumeMockRecovery(body.recoveryToken) : null;
            if (!recovery) return Response.json({ success: false, error: "That recovery session is invalid or expired." }, { status: 400 });
            const updated = updateMockAccountPassword(recovery.sessionTicket, password);
            if (!updated.success) return Response.json(updated, { status: 400 });
            return Response.json({ success: true });
          }

          const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
          const token = body.recoveryToken?.trim();
          if (!secretKey || !token) return Response.json({ success: false, error: "This recovery link is invalid or expired." }, { status: 400 });
          const response = await fetch(`${PLAYFAB_API_BASE}/Admin/ResetPassword`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
            body: JSON.stringify({ Password: password, Token: token }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.code !== 200) return Response.json({ success: false, error: result.errorMessage ?? "This recovery link is invalid or expired." }, { status: 400 });
          return Response.json({ success: true });
        } catch (error) {
          console.error("[Auth] Password recovery reset failed:", error);
          return Response.json({ success: false, error: "Unable to reset the password." }, { status: 500 });
        }
      },
    },
  },
});