import { createFileRoute } from "@tanstack/react-router";
import { isMockMode, PLAYFAB_API_BASE } from "@/lib/playfab/config";
import { findMockAccount } from "@/lib/playfab/mock-accounts";
import { createMockRecovery } from "@/lib/playfab/mock-password-recovery";
import { isValidEmail } from "@/lib/validation";

type RecoveryScope = "player" | "admin";

type PlayFabResult = {
  code?: number;
  errorCode?: number;
  errorMessage?: string;
  data?: any;
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

function recoveryError(result: PlayFabResult, fallback: string) {
  switch (result.errorCode) {
    case 1325:
      return "This account has no PlayFab contact email. Sign in once so Crew On Set can register its recovery email, then try again.";
    case 1341:
      return "PlayFab email delivery is not configured. Install and configure the SMTP add-on in PlayFab Game Manager.";
    case 1427:
      return "PlayFab rejected this recipient email address. Check the address and try again.";
    default:
      return result.errorMessage ?? fallback;
  }
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
          const lookup = await playFabServerRequest("/Admin/GetUserAccountInfo", { Email: email }, secretKey);
          const userInfo = lookup.result.data?.UserInfo;
          const playFabId = userInfo?.PlayFabId as string | undefined;
          if (!lookup.response.ok || lookup.result.code !== 200 || !playFabId) {
            return Response.json({ success: false, error: "Email does not exist in the game." }, { status: 404 });
          }

          const tagsResult = await playFabServerRequest("/Server/GetPlayerTags", { PlayFabId: playFabId }, secretKey);
          const tags = Array.isArray(tagsResult.result.data?.Tags) ? tagsResult.result.data.Tags : [];
          const isAdmin = tags.some(isAdminTag);
          if ((scope === "admin" && !isAdmin) || (scope === "player" && isAdmin)) {
            return Response.json({ success: false, error: "Email does not exist in this account type." }, { status: 404 });
          }

          // PlayFab sends recovery mail to the contact email, which is separate
          // from the login email. Existing accounts may predate Crew On Set's
          // contact-email sync, so make the verified account email the contact
          // email immediately before requesting recovery.
          const contact = await playFabServerRequest("/Server/AddOrUpdateContactEmail", {
            PlayFabId: playFabId,
            EmailAddress: email,
          }, secretKey);
          if (!contact.response.ok || contact.result.code !== 200) {
            console.error("[PlayFab] Could not register recovery contact email:", {
              errorCode: contact.result.errorCode,
              errorMessage: contact.result.errorMessage,
              playFabId,
              scope,
            });
            return Response.json({
              success: false,
              error: recoveryError(contact.result, "PlayFab could not register the account email for recovery."),
            }, { status: 502 });
          }
          // This is the documented PlayFab custom-template flow. The email is
          // sent to the account's PlayFab contact email, while the template's
          // $ConfirmationUrl$ carries the secure reset token.
          const sent = await playFabServerRequest("/Server/SendCustomAccountRecoveryEmail", {
            Email: email,
            EmailTemplateId: templateId,
          }, secretKey);
          if (!sent.response.ok || sent.result.code !== 200) {
            console.error("[PlayFab] Recovery email delivery failed:", {
              errorCode: sent.result.errorCode,
              errorMessage: sent.result.errorMessage,
              playFabId,
              scope,
            });
            return Response.json({ success: false, error: recoveryError(sent.result, "PlayFab could not send the recovery email.") }, { status: 502 });
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