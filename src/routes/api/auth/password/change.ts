import { createFileRoute } from "@tanstack/react-router";
import { isMockMode, PLAYFAB_API_BASE } from "@/lib/playfab/config";
import { updateMockAccountPassword, getMockAccountBySessionTicket } from "@/lib/playfab/mock-accounts";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { isValidPassword, PASSWORD_ERROR } from "@/lib/validation";

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

        return Response.json({ success: false, error: "Real PlayFab password changes use the secure Forgot Password recovery flow." }, { status: 400 });
      },
    },
  },
});