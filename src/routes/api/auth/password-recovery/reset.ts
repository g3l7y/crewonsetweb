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
          if (!isValidPassword(password))
            return Response.json({ success: false, error: PASSWORD_ERROR }, { status: 400 });

          if (isMockMode()) {
            const recovery = body.recoveryToken ? consumeMockRecovery(body.recoveryToken) : null;
            if (!recovery)
              return Response.json(
                { success: false, error: "That recovery session is invalid or expired." },
                { status: 400 },
              );
            const updated = updateMockAccountPassword(recovery.sessionTicket, password);
            if (!updated.success) return Response.json(updated, { status: 400 });
            return Response.json({ success: true, scope: recovery.scope });
          }

          const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
          const token = body.recoveryToken?.trim();
          if (!secretKey || !token)
            return Response.json(
              { success: false, error: "This recovery link is invalid or expired." },
              { status: 400 },
            );

          const playerLookupResponse = await fetch(
            `${PLAYFAB_API_BASE}/Admin/GetPlayerIdFromAuthToken`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
              body: JSON.stringify({ Token: token, TokenType: "Email" }),
            },
          );
          const playerLookup = await playerLookupResponse.json().catch(() => ({}));
          const playFabId = playerLookup?.data?.PlayFabId as string | undefined;
          if (!playerLookupResponse.ok || playerLookup.code !== 200 || !playFabId) {
            return Response.json(
              { success: false, error: "This recovery link is invalid or expired." },
              { status: 400 },
            );
          }

          const tagsResponse = await fetch(`${PLAYFAB_API_BASE}/Server/GetPlayerTags`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
            body: JSON.stringify({ PlayFabId: playFabId }),
          });
          const tagsResult = await tagsResponse.json().catch(() => ({}));
          if (!tagsResponse.ok || tagsResult.code !== 200) {
            return Response.json(
              { success: false, error: "Unable to verify this account type. Please try again." },
              { status: 503 },
            );
          }
          const tags = Array.isArray(tagsResult.data?.Tags) ? tagsResult.data.Tags : [];
          const scope = tags.some(
            (tag: unknown) =>
              typeof tag === "string" &&
              ["role:admin", ".role:admin"].some(
                (suffix) => tag.toLowerCase() === suffix || tag.toLowerCase().endsWith(suffix),
              ),
          )
            ? "admin"
            : "player";

          const response = await fetch(`${PLAYFAB_API_BASE}/Admin/ResetPassword`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
            body: JSON.stringify({ Password: password, Token: token }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.code !== 200)
            return Response.json(
              {
                success: false,
                error: result.errorMessage ?? "This recovery link is invalid or expired.",
              },
              { status: 400 },
            );
          return Response.json({ success: true, scope });
        } catch (error) {
          console.error("[Auth] Password recovery reset failed:", error);
          return Response.json(
            { success: false, error: "Unable to reset the password." },
            { status: 500 },
          );
        }
      },
    },
  },
});
