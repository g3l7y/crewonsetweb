import { createFileRoute } from "@tanstack/react-router";
import { isMockMode } from "@/lib/playfab/config";
import { verifyMockRecovery } from "@/lib/playfab/mock-password-recovery";

export const Route = createFileRoute("/api/auth/password-recovery/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isMockMode()) return Response.json({ success: false, error: "Real recovery uses the secure link in your email." }, { status: 400 });
        const body = (await request.json()) as { email?: string; scope?: "player" | "admin"; code?: string };
        const email = body.email?.trim().toLowerCase() ?? "";
        const scope = body.scope === "admin" ? "admin" : "player";
        const token = verifyMockRecovery(email, scope, body.code ?? "");
        if (!token) return Response.json({ success: false, error: "That code is invalid or expired. Please request a new one." }, { status: 400 });
        return Response.json({ success: true, recoveryToken: token });
      },
    },
  },
});