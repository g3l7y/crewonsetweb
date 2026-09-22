import { createFileRoute } from "@tanstack/react-router";
import { isMockMode } from "@/lib/playfab/config";
import { updateMockAccountPassword, getMockAccountBySessionTicket } from "@/lib/playfab/mock-accounts";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { isValidPassword, PASSWORD_ERROR } from "@/lib/validation";
import { verifyPlayFabCurrentPassword } from "@/lib/playfab/credential-verification";

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
        return Response.json({ success: false, error: "PlayFab password changes must be completed through the secure Forgot Password recovery link." }, { status: 400 });
      },
    },
  },
});