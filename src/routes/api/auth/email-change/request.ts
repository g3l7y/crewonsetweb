import { randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { accountEmailActionUrl, sendAccountEmailChangeLink } from "@/lib/account-email";
import { isMockMode, PLAYFAB_API_BASE } from "@/lib/playfab/config";
import { createMockEmailChange } from "@/lib/playfab/mock-email-change";
import {
  createEmailChangeToken,
  hashEmailChangeToken,
  isEmailLoginIdentityStoreConfigured,
  revokeEmailChangeToken,
} from "@/lib/playfab/email-login-identities";
import { getMockAccountBySessionTicket } from "@/lib/playfab/mock-accounts";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { validateSessionFromRequest } from "@/lib/playfab/session";

export const Route = createFileRoute("/api/auth/email-change/request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || !session.playFabId) {
          return Response.json(
            { success: false, error: "Sign in again before changing your email." },
            { status: 401 },
          );
        }
        const role = session.role === "admin" ? "admin" : "player";

        if (isMockMode()) {
          const account = getMockAccountBySessionTicket(session.sessionTicket);
          if (!account || account.role !== role) {
            return Response.json(
              { success: false, error: "Session expired. Please sign in again." },
              { status: 401 },
            );
          }
          const token = createMockEmailChange(session.sessionTicket, role);
          const path = role === "admin" ? "/admin/settings" : "/portal/settings";
          return Response.json({
            success: true,
            mode: "mock",
            currentEmail: account.email,
            verificationUrl: accountEmailActionUrl(request, path, token),
            message:
              "Mock email verification is ready. Open the demo verification link to continue.",
          });
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
        if (!isEmailLoginIdentityStoreConfigured()) {
          return Response.json(
            {
              success: false,
              error:
                "Verified email sign-in changes require the server DATABASE_URL to be configured.",
            },
            { status: 503 },
          );
        }

        try {
          const accountResponse = await fetch(`${PLAYFAB_API_BASE}/Server/GetUserData`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
            body: JSON.stringify({
              PlayFabId: session.playFabId,
              Keys: [PLAYFAB_DATA_KEYS.profile_metadata],
            }),
          });
          const accountResult = await accountResponse.json().catch(() => ({}));
          if (!accountResponse.ok || accountResult.code !== 200) {
            return Response.json(
              {
                success: false,
                error: "Unable to read the current account email. Please try again.",
              },
              { status: 502 },
            );
          }
          let savedEmail = "";
          const raw = accountResult.data?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          if (typeof raw === "string") {
            try {
              const metadata = JSON.parse(raw) as { email?: unknown };
              if (typeof metadata.email === "string")
                savedEmail = metadata.email.trim().toLowerCase();
            } catch {
              // Use the authenticated session's email when older profile data is malformed.
            }
          }
          const currentEmail = savedEmail || session.email?.trim().toLowerCase() || "";
          if (!currentEmail)
            return Response.json(
              {
                success: false,
                error: "There is no current email address associated with this account.",
              },
              { status: 400 },
            );

          const token = randomBytes(32).toString("base64url");
          const tokenHash = hashEmailChangeToken(token);
          await createEmailChangeToken(
            tokenHash,
            session.playFabId,
            role,
            new Date(Date.now() + 30 * 60 * 1000),
          );
          const path = role === "admin" ? "/admin/settings" : "/portal/settings";
          const actionUrl = accountEmailActionUrl(request, path, token);
          try {
            await sendAccountEmailChangeLink(currentEmail, actionUrl, role);
          } catch (mailError) {
            await revokeEmailChangeToken(tokenHash).catch(() => undefined);
            console.error("[Auth] Email-change verification email failed:", mailError);
            return Response.json(
              {
                success: false,
                error:
                  mailError instanceof Error
                    ? mailError.message
                    : "Unable to send the verification email.",
              },
              { status: 502 },
            );
          }

          return Response.json({
            success: true,
            currentEmail,
            message: `A secure email-change link was sent to ${currentEmail}. It expires in 30 minutes.`,
          });
        } catch (error) {
          console.error("[Auth] Could not start email change:", error);
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "Unable to start the email change.",
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
