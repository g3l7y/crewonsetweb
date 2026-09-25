import { createFileRoute } from "@tanstack/react-router";
import { isMockMode } from "@/lib/playfab/config";
import { hasMockEmailChange } from "@/lib/playfab/mock-email-change";
import {
  hashEmailChangeToken,
  hasValidEmailChangeToken,
} from "@/lib/playfab/email-login-identities";
import { validateSessionFromRequest } from "@/lib/playfab/session";

export const Route = createFileRoute("/api/auth/email-change/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || !session.playFabId)
          return Response.json(
            { success: false, error: "Sign in to the same account to continue this email change." },
            { status: 401 },
          );
        const body = (await request.json().catch(() => ({}))) as { token?: string };
        const token = body.token?.trim() ?? "";
        if (!token || token.length > 256)
          return Response.json(
            { success: false, error: "This email-change link is invalid or expired." },
            { status: 400 },
          );
        const role = session.role === "admin" ? "admin" : "player";

        try {
          const valid = isMockMode()
            ? hasMockEmailChange(token, session.sessionTicket, role)
            : await hasValidEmailChangeToken(hashEmailChangeToken(token), session.playFabId, role);
          if (!valid)
            return Response.json(
              {
                success: false,
                error: "This email-change link is invalid, expired, or belongs to another account.",
              },
              { status: 400 },
            );
          return Response.json({ success: true });
        } catch (error) {
          console.error("[Auth] Email-change verification failed:", error);
          return Response.json(
            {
              success: false,
              error: "Unable to verify this email-change link. Please request another.",
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
