import { createFileRoute } from "@tanstack/react-router";
import { isMockMode, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";
import { createSessionCookies } from "@/lib/playfab/session";
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  EMAIL_ERROR,
  PASSWORD_ERROR,
  USERNAME_ERROR,
} from "@/lib/validation";
import {
  isMockEmailTaken,
  isMockUsernameTaken,
  registerMockAccount,
} from "@/lib/playfab/mock-accounts";
import { syncPlayFabContactEmail } from "@/lib/playfab/contact-email";
import type { SessionData, AuthResponse } from "@/lib/playfab/types";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { createPolicyAcceptanceRecord } from "@/lib/legal-consent";
import { sendPlayerWelcomeEmail } from "@/lib/account-email";
import { findPlayFabAccountByIdentifier } from "@/lib/playfab/credential-verification";
import {
  findEmailLoginAlias,
  isEmailLoginIdentityStoreConfigured,
  saveEmailLoginAlias,
} from "@/lib/playfab/email-login-identities";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email, password, username, acceptedPolicies } = (await request.json()) as {
            email?: string;
            password?: string;
            username?: string;
            acceptedPolicies?: boolean;
          };

          const normalizedEmail = email?.trim().toLowerCase() ?? "";
          const normalizedUsername = username?.trim() ?? "";

          if (!normalizedEmail || !password || !normalizedUsername) {
            return Response.json(
              {
                success: false,
                error: "Email, password, and username are required.",
              } satisfies AuthResponse,
              { status: 400 },
            );
          }

          if (acceptedPolicies !== true) {
            return Response.json(
              {
                success: false,
                error:
                  "Please accept the Terms & Conditions and Privacy Policy to create an account.",
              } satisfies AuthResponse,
              { status: 400 },
            );
          }

          if (!isValidEmail(normalizedEmail)) {
            return Response.json({ success: false, error: EMAIL_ERROR } satisfies AuthResponse, {
              status: 400,
            });
          }

          if (!isValidUsername(normalizedUsername)) {
            return Response.json({ success: false, error: USERNAME_ERROR } satisfies AuthResponse, {
              status: 400,
            });
          }

          if (!isValidPassword(password)) {
            return Response.json({ success: false, error: PASSWORD_ERROR } satisfies AuthResponse, {
              status: 400,
            });
          }

          let session: SessionData;

          if (isMockMode()) {
            if (isMockUsernameTaken(normalizedUsername)) {
              return Response.json(
                {
                  success: false,
                  error: "That username is already in use. Please choose another.",
                } satisfies AuthResponse,
                { status: 409 },
              );
            }
            if (isMockEmailTaken(normalizedEmail)) {
              return Response.json(
                {
                  success: false,
                  error: "That email is already in use. Please choose another.",
                } satisfies AuthResponse,
                { status: 409 },
              );
            }
            const account = registerMockAccount(normalizedEmail, password, normalizedUsername);
            if (!account) {
              return Response.json(
                {
                  success: false,
                  error: "That username is already in use. Please choose another.",
                } satisfies AuthResponse,
                { status: 409 },
              );
            }
            session = account;
          } else {
            let playFabUsername = normalizedUsername;
            let playFabEmail = normalizedEmail;
            let usedInternalUsername = false;
            let usedInternalEmail = false;
            let playfabResponse: Response | null = null;
            let pfResult: {
              code?: number;
              errorCode?: number;
              data?: { PlayFabId?: string; SessionTicket?: string };
            } = {};

            // PlayFab usernames and emails are unique across the PlayFab
            // service, even when an account using them belongs to another
            // title. Keep the player's chosen title username and, when the
            // email alias store is available, their email as the credentials
            // they use on this website while giving PlayFab unique sign-in IDs.
            for (let attempt = 0; attempt < 3; attempt += 1) {
              playfabResponse = await fetch(
                `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/RegisterPlayFabUser`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    TitleId: PLAYFAB_TITLE_ID,
                    Email: playFabEmail,
                    Password: password,
                    Username: playFabUsername,
                    DisplayName: normalizedUsername,
                    RequireBothUsernameAndEmail: true,
                  }),
                },
              );
              pfResult = await playfabResponse.json().catch(() => ({}));
              if (playfabResponse.ok && pfResult.code === 200) break;

              const errorCode = Number(pfResult.errorCode);
              if (errorCode === 1009 && !usedInternalUsername) {
                playFabUsername = `COS_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
                usedInternalUsername = true;
                continue;
              }
              if (errorCode === 1006 && !usedInternalEmail) {
                try {
                  const [accountInThisTitle, existingAlias] = await Promise.all([
                    findPlayFabAccountByIdentifier(normalizedEmail),
                    isEmailLoginIdentityStoreConfigured() ? findEmailLoginAlias(normalizedEmail) : null,
                  ]);
                  if (accountInThisTitle || existingAlias) {
                    return Response.json({ success: false, error: "That email is already in use by a Crew On Set account. Please sign in instead." } satisfies AuthResponse, { status: 409 });
                  }
                } catch (lookupError) {
                  return Response.json({ success: false, error: lookupError instanceof Error ? lookupError.message : "We couldn't verify this email. Please try again shortly." } satisfies AuthResponse, { status: 503 });
                }
                if (!isEmailLoginIdentityStoreConfigured()) {
                  return Response.json({ success: false, error: "This email is already linked to a PlayFab account outside this game. Please contact support to use it here." } satisfies AuthResponse, { status: 409 });
                }
                playFabEmail = `cos-${crypto.randomUUID().replace(/-/g, "")}@login.crewonset.invalid`;
                usedInternalEmail = true;
                continue;
              }
              break;
            }

            if (!playfabResponse?.ok || pfResult.code !== 200) {
              const errorCode = Number(pfResult.errorCode);
              const error =
                errorCode === 1006
                  ? "This email is already linked to a PlayFab account and could not be linked to Crew On Set. Please use a different email or contact support."
                  : errorCode === 1009
                    ? "That username is already linked to a PlayFab account. Please try another username."
                    : errorCode === 1058
                      ? "That username is already in use by a Crew On Set player. Please choose another."
                    : errorCode === 1322
                      ? "An account using these credentials is still being closed. Please try again shortly."
                      : "We couldn't create your account. Please check your details and try again.";
              return Response.json(
                {
                  success: false,
                  error,
                } satisfies AuthResponse,
                { status: [1006, 1009, 1058, 1322].includes(errorCode) ? 409 : 400 },
              );
            }

            const playFabId = pfResult.data?.PlayFabId;
            const sessionTicket = pfResult.data?.SessionTicket;
            if (!playFabId || !sessionTicket) {
              return Response.json({ success: false, error: "PlayFab created the account but did not return a sign-in session. Please try logging in." } satisfies AuthResponse, { status: 502 });
            }
            session = {
              playFabId,
              sessionTicket,
              role: "player",
              username: normalizedUsername,
              displayName: normalizedUsername,
              playFabUsername,
              email: normalizedEmail,
            };

            try {
              const consentResponse = await fetch(
                `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/UpdateUserData`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Authorization": sessionTicket,
                  },
                  body: JSON.stringify({
                    Data: {
                      [PLAYFAB_DATA_KEYS.legal_consent]: JSON.stringify(createPolicyAcceptanceRecord()),
                      [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify({
                        username: normalizedUsername,
                        email: normalizedEmail,
                        credentialsSetup: true,
                      }),
                    },
                  }),
                },
              );
              if (!consentResponse.ok)
                console.warn("[PlayFab] Could not save signup policy acceptance.");
            } catch (consentError) {
              console.error("[PlayFab] Could not save signup policy acceptance:", consentError);
            }

            try {
              await syncPlayFabContactEmail(sessionTicket, normalizedEmail, {
                playFabId,
                ...(process.env["PLAYFAB_SECRET_KEY"]?.trim()
                  ? { secretKey: process.env["PLAYFAB_SECRET_KEY"].trim() }
                  : {}),
              });
            } catch (contactEmailError) {
              console.error(
                "[PlayFab] Could not sync registration contact email:",
                contactEmailError,
              );
            }

            if (isEmailLoginIdentityStoreConfigured()) {
              try {
                await saveEmailLoginAlias(normalizedEmail, playFabId, "player");
              } catch (aliasError) {
                console.error("[Auth] Could not save the signup email alias:", aliasError);
              }
            }

            try {
              await sendPlayerWelcomeEmail(normalizedEmail, normalizedUsername);
            } catch (emailError) {
              console.error("[Auth] Could not send player welcome email:", emailError);
            }
          }

          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies(session)) {
            headers.append("Set-Cookie", cookie);
          }

          const response: AuthResponse = {
            success: true,
            session: {
              playFabId: session.playFabId,
              role: session.role,
              username: session.username || session.displayName,
              displayName: session.displayName,
              email: session.email,
            },
            destination: "/portal",
          };

          return new Response(JSON.stringify(response), { headers });
        } catch (error) {
          console.error("[Auth] Registration error:", error);
          return Response.json(
            { success: false, error: "An unexpected error occurred." } satisfies AuthResponse,
            { status: 500 },
          );
        }
      },
    },
  },
});
