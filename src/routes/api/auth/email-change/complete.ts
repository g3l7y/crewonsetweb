import { createFileRoute } from "@tanstack/react-router";
import { sendAccountEmailChangeConfirmation } from "@/lib/account-email";
import { isMockMode, PLAYFAB_API_BASE } from "@/lib/playfab/config";
import { syncPlayFabContactEmail } from "@/lib/playfab/contact-email";
import {
  completeEmailChangeToken,
  findEmailLoginAlias,
  hashEmailChangeToken,
  hasValidEmailChangeToken,
} from "@/lib/playfab/email-login-identities";
import { consumeMockEmailChange } from "@/lib/playfab/mock-email-change";
import {
  getMockAccountBySessionTicket,
  isMockEmailTaken,
  updateMockAccountEmail,
} from "@/lib/playfab/mock-accounts";
import { findPlayFabAccountByIdentifier } from "@/lib/playfab/credential-verification";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { createSessionCookies, validateSessionFromRequest } from "@/lib/playfab/session";
import { EMAIL_ERROR, isValidEmail } from "@/lib/validation";

type ProfileMetadata = { username?: string; email?: string; [key: string]: unknown };

export const Route = createFileRoute("/api/auth/email-change/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || !session.playFabId)
          return Response.json(
            { success: false, error: "Sign in to the same account to finish this email change." },
            { status: 401 },
          );
        const body = (await request.json().catch(() => ({}))) as { token?: string; email?: string };
        const token = body.token?.trim() ?? "";
        const email = body.email?.trim().toLowerCase() ?? "";
        if (!token || token.length > 256)
          return Response.json(
            { success: false, error: "This email-change link is invalid or expired." },
            { status: 400 },
          );
        if (!isValidEmail(email))
          return Response.json({ success: false, error: EMAIL_ERROR }, { status: 400 });
        const role = session.role === "admin" ? "admin" : "player";

        try {
          if (isMockMode()) {
            const account = getMockAccountBySessionTicket(session.sessionTicket);
            if (!account || account.role !== role) {
              return Response.json(
                { success: false, error: "This email-change link is invalid or expired." },
                { status: 400 },
              );
            }
            if (email.toLowerCase() !== account.email.toLowerCase() && isMockEmailTaken(email)) {
              return Response.json(
                { success: false, error: "That email is already in use. Please choose another." },
                { status: 409 },
              );
            }
            if (!consumeMockEmailChange(token, session.sessionTicket, role)) {
              return Response.json(
                { success: false, error: "This email-change link is invalid or expired." },
                { status: 400 },
              );
            }
            const updated = updateMockAccountEmail(session.sessionTicket, email);
            if (!updated.success) return Response.json(updated, { status: 409 });
            const updatedAccount = getMockAccountBySessionTicket(session.sessionTicket);
            const headers = new Headers({ "Content-Type": "application/json" });
            for (const cookie of createSessionCookies({
              ...session,
              email: updatedAccount?.email ?? email,
            }))
              headers.append("Set-Cookie", cookie);
            return new Response(
              JSON.stringify({
                success: true,
                email: updatedAccount?.email ?? email,
                confirmationSent: false,
                message: "Demo email updated.",
              }),
              { headers },
            );
          }

          const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
          if (!secretKey)
            return Response.json(
              {
                success: false,
                error: "Email changes are unavailable: PLAYFAB_SECRET_KEY is not configured.",
              },
              { status: 503 },
            );
          const tokenHash = hashEmailChangeToken(token);
          if (!(await hasValidEmailChangeToken(tokenHash, session.playFabId, role))) {
            return Response.json(
              { success: false, error: "This email-change link is invalid or expired." },
              { status: 400 },
            );
          }

          const currentAlias = await findEmailLoginAlias(email);
          if (currentAlias && currentAlias.playfab_id !== session.playFabId) {
            return Response.json(
              { success: false, error: "That email is already in use. Please choose another." },
              { status: 409 },
            );
          }
          const existing = await findPlayFabAccountByIdentifier(email);
          if (existing && existing.playFabId !== session.playFabId) {
            return Response.json(
              { success: false, error: "That email is already in use. Please choose another." },
              { status: 409 },
            );
          }

          const userDataResponse = await fetch(`${PLAYFAB_API_BASE}/Server/GetUserData`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
            body: JSON.stringify({
              PlayFabId: session.playFabId,
              Keys: [PLAYFAB_DATA_KEYS.profile_metadata],
            }),
          });
          const userDataResult = await userDataResponse.json().catch(() => ({}));
          if (!userDataResponse.ok || userDataResult.code !== 200)
            throw new Error("PlayFab could not read the account profile.");
          const rawMetadata =
            userDataResult.data?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          let metadata: ProfileMetadata = {};
          if (typeof rawMetadata === "string") {
            try {
              metadata = JSON.parse(rawMetadata) as ProfileMetadata;
            } catch {
              metadata = {};
            }
          }

          // Keep recovery delivery and the portal's current identity aligned.
          await syncPlayFabContactEmail(session.sessionTicket, email, {
            playFabId: session.playFabId,
            secretKey,
          });
          const updateResponse = await fetch(`${PLAYFAB_API_BASE}/Server/UpdateUserData`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
            body: JSON.stringify({
              PlayFabId: session.playFabId,
              Data: {
                [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify({ ...metadata, email }),
              },
            }),
          });
          const updateResult = await updateResponse.json().catch(() => ({}));
          if (!updateResponse.ok || updateResult.code !== 200)
            throw new Error(
              updateResult.errorMessage ?? "PlayFab could not save the new account email.",
            );

          if (!(await completeEmailChangeToken(tokenHash, email, session.playFabId, role))) {
            return Response.json(
              {
                success: false,
                error:
                  "This email-change link has already been used or expired. Request a fresh link if the email was not updated.",
              },
              { status: 400 },
            );
          }

          let confirmationSent = true;
          try {
            await sendAccountEmailChangeConfirmation(
              email,
              metadata.username || session.username || session.displayName || "Crew On Set",
              role,
            );
          } catch (mailError) {
            confirmationSent = false;
            console.error("[Auth] Email-change confirmation could not be delivered:", mailError);
          }

          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies({ ...session, email }))
            headers.append("Set-Cookie", cookie);
          return new Response(
            JSON.stringify({
              success: true,
              email,
              confirmationSent,
              message: confirmationSent
                ? "Email updated and confirmation sent to the new address."
                : "Email updated, but the confirmation email could not be delivered. Please check your email service configuration.",
            }),
            { headers },
          );
        } catch (error) {
          console.error("[Auth] Email change failed:", error);
          return Response.json(
            {
              success: false,
              error:
                error instanceof Error ? error.message : "Unable to update this email address.",
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
