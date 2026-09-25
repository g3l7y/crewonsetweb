import { createFileRoute } from "@tanstack/react-router";
import { isMockMode, PLAYFAB_API_BASE } from "@/lib/playfab/config";
import { findMockAccount } from "@/lib/playfab/mock-accounts";
import { createMockRecovery } from "@/lib/playfab/mock-password-recovery";
import { findPlayFabAccountByIdentifier } from "@/lib/playfab/credential-verification";
import { sendPlayFabRecoveryEmail } from "@/lib/playfab/password-recovery-email";
import { isValidEmail } from "@/lib/validation";

type RecoveryScope = "player" | "admin";

type PlayFabResult = {
  code?: number;
  errorCode?: number;
  errorMessage?: string;
  data?: {
    Data?: Record<string, { Value?: string } | undefined>;
    Tags?: unknown[];
  };
};

function isAdminTag(value: unknown) {
  return typeof value === "string" && ["role:admin", ".role:admin"].some((suffix) => value.toLowerCase() === suffix || value.toLowerCase().endsWith(suffix));
}

async function playFabServerRequest(path: string, body: Record<string, unknown>, secretKey: string) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as PlayFabResult;
  return { response, result };
}

export const Route = createFileRoute("/api/auth/password-recovery/request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { email?: string; scope?: RecoveryScope };
          const email = body.email?.trim().toLowerCase() ?? "";
          const scope: RecoveryScope = body.scope === "admin" ? "admin" : "player";

          if (!isValidEmail(email)) {
            return Response.json({ success: false, error: "Please enter a valid email address." }, { status: 400 });
          }

          if (isMockMode()) {
            const account = findMockAccount(email);
            if (!account || account.role !== scope) {
              return Response.json({ success: false, error: "Email does not exist in this account type." }, { status: 404 });
            }
            const recovery = createMockRecovery(account, scope);
            return Response.json({
              success: true,
              mode: "mock",
              demoCode: recovery.code,
              message: `A demo recovery code was created for ${account.email}.`,
            });
          }

          const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
          const templateId = process.env["PLAYFAB_RECOVERY_EMAIL_TEMPLATE_ID"]?.trim();
          if (!secretKey) {
            return Response.json({ success: false, error: "Server recovery is not configured: PLAYFAB_SECRET_KEY is missing." }, { status: 500 });
          }
          if (!templateId) {
            return Response.json({ success: false, error: "Server recovery is not configured: PLAYFAB_RECOVERY_EMAIL_TEMPLATE_ID is missing." }, { status: 500 });
          }

          // Resolve the account first so player recovery cannot be used for an
          // admin account (or vice versa), then let PlayFab deliver to the
          // contact email associated with that account.
          const account = await findPlayFabAccountByIdentifier(email);
          const playFabId = account?.playFabId;
          if (!playFabId) {
            return Response.json({ success: false, error: "Email does not exist in the game." }, { status: 404 });
          }

          const profileData = await playFabServerRequest('/Server/GetUserData', {
            PlayFabId: playFabId,
            Keys: ['profile_metadata'],
          }, secretKey);
          const rawProfile = profileData.result.data?.Data?.['profile_metadata']?.Value;
          if (typeof rawProfile === 'string') {
            try {
              const profile = JSON.parse(rawProfile) as { email?: unknown };
              if (typeof profile.email === 'string' && profile.email.trim().toLowerCase() !== email) {
                return Response.json({ success: false, error: 'Email does not exist in the game.' }, { status: 404 });
              }
            } catch {
              // Ignore malformed legacy profile metadata; PlayFab remains the fallback source.
            }
          }

          const tagsResult = await playFabServerRequest("/Server/GetPlayerTags", { PlayFabId: playFabId }, secretKey);
          const tags = Array.isArray(tagsResult.result.data?.Tags) ? tagsResult.result.data.Tags : [];
          const isAdmin = tags.some(isAdminTag);
          if ((scope === "admin" && !isAdmin) || (scope === "player" && isAdmin)) {
            return Response.json({ success: false, error: "Email does not exist in this account type." }, { status: 404 });
          }

          try {
            await sendPlayFabRecoveryEmail(playFabId, email, secretKey);
          } catch (error) {
            console.error("[PlayFab] Recovery email delivery failed:", { playFabId, scope, error });
            return Response.json({ success: false, error: error instanceof Error ? error.message : "PlayFab could not send the recovery email." }, { status: 502 });
          }

          return Response.json({
            success: true,
            mode: "real",
            message: "Recovery email sent. Open its secure link to choose a new password.",
          });
        } catch (error) {
          console.error("[Auth] Password recovery request failed:", error);
          return Response.json({ success: false, error: "Unable to start password recovery." }, { status: 500 });
        }
      },
    },
  },
});
