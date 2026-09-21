import { createFileRoute } from "@tanstack/react-router";
import { isMockMode, PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";
import { findMockAccount } from "@/lib/playfab/mock-accounts";
import { createMockRecovery } from "@/lib/playfab/mock-password-recovery";
import { isValidEmail } from "@/lib/validation";

type RecoveryScope = "player" | "admin";

function isAdminTag(value: unknown) {
  return typeof value === "string" && ["role:admin", ".role:admin"].some((suffix) => value.toLowerCase() === suffix || value.toLowerCase().endsWith(suffix));
}

async function playFabAdminRequest(path: string, body: Record<string, unknown>, secretKey: string) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
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
          if (!secretKey) {
            return Response.json({ success: false, error: "Server recovery is not configured: PLAYFAB_SECRET_KEY is missing." }, { status: 500 });
          }

          const lookup = await playFabAdminRequest("/Admin/GetUserAccountInfo", { Email: email }, secretKey);
          const userInfo = lookup.result?.data?.UserInfo;
          const playFabId = userInfo?.PlayFabId as string | undefined;
          if (!lookup.response.ok || lookup.result?.code !== 200 || !playFabId) {
            return Response.json({ success: false, error: "Email does not exist in the game." }, { status: 404 });
          }

          const tagsResult = await playFabAdminRequest("/Server/GetPlayerTags", { PlayFabId: playFabId }, secretKey);
          const tags = Array.isArray(tagsResult.result?.data?.Tags) ? tagsResult.result.data.Tags : [];
          const isAdmin = tags.some(isAdminTag);
          if ((scope === "admin" && !isAdmin) || (scope === "player" && isAdmin)) {
            return Response.json({ success: false, error: "Email does not exist in this account type." }, { status: 404 });
          }

          const templateId = process.env["PLAYFAB_RECOVERY_EMAIL_TEMPLATE_ID"]?.trim();
          if (!templateId) {
            return Response.json({ success: false, error: "Server recovery is not configured: PLAYFAB_RECOVERY_EMAIL_TEMPLATE_ID is missing." }, { status: 500 });
          }
          const recoveryRequest: Record<string, unknown> = { Email: email, EmailTemplateId: templateId };
          const sent = await playFabAdminRequest("/Admin/SendAccountRecoveryEmail", recoveryRequest, secretKey);
          if (!sent.response.ok || sent.result?.code !== 200) {
            const errorCode = sent.result?.errorCode;
            const message = errorCode === 1325
              ? "This account does not have a PlayFab contact email yet. Sign in once, then request recovery again."
              : errorCode === 1341
                ? "PlayFab email delivery is not configured. Enable the SMTP add-on and try again."
                : sent.result?.errorMessage ?? "PlayFab could not send the recovery email.";
            return Response.json({ success: false, error: message }, { status: 502 });
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