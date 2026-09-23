import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_TITLE_ID, isMockMode } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { createSessionCookies, hasActivePlayFabBan } from "@/lib/playfab/session";
import type { AuthResponse, SessionData } from "@/lib/playfab/types";
import { getPlayFabContactEmail, syncPlayFabContactEmail } from "@/lib/playfab/contact-email";
import { createPolicyAcceptanceRecord } from "@/lib/legal-consent";

export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (isMockMode()) {
            return Response.json(
              {
                success: false,
                error: "Google sign-in is only available in real mode.",
              } satisfies AuthResponse,
              { status: 400 },
            );
          }

          const { accessToken, intent, acceptedPolicies } = (await request.json()) as {
            accessToken?: string;
            intent?: "login" | "signup";
            acceptedPolicies?: boolean;
          };
          if (intent === "signup" && acceptedPolicies !== true) {
            return Response.json(
              {
                success: false,
                error:
                  "Please accept the Terms & Conditions and Privacy Policy before signing up with Google.",
              } satisfies AuthResponse,
              { status: 400 },
            );
          }
          if (!accessToken?.trim()) {
            return Response.json(
              { success: false, error: "Google access token is required." } satisfies AuthResponse,
              { status: 400 },
            );
          }

          const playfabResponse = await fetch(
            "https://" + PLAYFAB_TITLE_ID + ".playfabapi.com/Client/LoginWithGoogleAccount",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                TitleId: PLAYFAB_TITLE_ID,
                AccessToken: accessToken,
                CreateAccount: intent === "signup",
                InfoRequestParameters: {
                  GetPlayerProfile: true,
                  GetUserAccountInfo: true,
                },
              }),
            },
          );

          const pfResult = await playfabResponse.json();
          if (!playfabResponse.ok || pfResult.code !== 200) {
            return Response.json(
              {
                success: false,
                error: pfResult.errorMessage ?? "Google sign-in failed in PlayFab.",
              } satisfies AuthResponse,
              { status: 401 },
            );
          }

          const pfData = pfResult.data;
          const banSecret = process.env["PLAYFAB_SECRET_KEY"]?.trim();
          if (banSecret) {
            try {
              if (await hasActivePlayFabBan(pfData.PlayFabId, banSecret)) {
                return Response.json(
                  {
                    success: false,
                    error: "This player account is banned.",
                  } satisfies AuthResponse,
                  { status: 403 },
                );
              }
            } catch (banError) {
              console.error("[PlayFab] Could not verify account ban status:", banError);
              return Response.json(
                {
                  success: false,
                  error: "Unable to verify this account status. Please try again.",
                } satisfies AuthResponse,
                { status: 503 },
              );
            }
          }
          const accountInfo = pfData.InfoResultPayload?.AccountInfo;
          const playerProfile = pfData.InfoResultPayload?.PlayerProfile;
          const email = accountInfo?.PrivateInfo?.Email ?? "";
          const displayName =
            playerProfile?.DisplayName ??
            accountInfo?.TitleInfo?.DisplayName ??
            accountInfo?.Username ??
            "";

          // This marker is stored in PlayFab player data, not in browser
          // storage, so the same Google account always reopens the same
          // profile on every device and in the game client.
          let metadata: {
            username?: string;
            googleProfileSetup?: boolean;
            credentialsSetup?: boolean;
          } = {};
          try {
            const userDataResponse = await fetch(
              `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/GetUserData`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Authorization": pfData.SessionTicket,
                },
                body: JSON.stringify({ Keys: [PLAYFAB_DATA_KEYS.profile_metadata] }),
              },
            );
            const userDataResult = await userDataResponse.json();
            const rawMetadata =
              userDataResult?.data?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
            if (rawMetadata) metadata = JSON.parse(rawMetadata) as typeof metadata;
          } catch {
            // Missing metadata is expected for a first-time Google account.
          }

          const savedUsername = metadata.username?.trim() ?? "";
          const playFabUsername = accountInfo?.Username?.trim() ?? "";
          const resolvedUsername = savedUsername || playFabUsername;
          const resolvedDisplayName =
            resolvedUsername || displayName || email.split("@")[0] || "Player";
          const credentialsAlreadyLinked =
            metadata.credentialsSetup === true || Boolean(playFabUsername);

          if (intent === "signup" && !email) {
            return Response.json(
              {
                success: false,
                error:
                  "Google did not provide an email address for this account. Please use email sign-up instead.",
              } satisfies AuthResponse,
              { status: 400 },
            );
          }

          if (intent === "signup") {
            try {
              const consentResponse = await fetch(
                `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/UpdateUserData`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Authorization": pfData.SessionTicket,
                  },
                  body: JSON.stringify({
                    Data: { [PLAYFAB_DATA_KEYS.legal_consent]: createPolicyAcceptanceRecord() },
                  }),
                },
              );
              if (!consentResponse.ok)
                console.warn("[PlayFab] Could not save Google signup policy acceptance.");
            } catch (consentError) {
              console.error(
                "[PlayFab] Could not save Google signup policy acceptance:",
                consentError,
              );
            }
          }

          let sessionEmail = email;
          if (email) {
            let existingContactEmail: string | null = null;
            try {
              existingContactEmail = await getPlayFabContactEmail(pfData.SessionTicket);
            } catch (contactEmailReadError) {
              console.error(
                "[PlayFab] Could not read Google contact email:",
                contactEmailReadError,
              );
            }
            if (existingContactEmail) {
              sessionEmail = existingContactEmail;
            } else {
              try {
                await syncPlayFabContactEmail(pfData.SessionTicket, email, {
                  playFabId: pfData.PlayFabId,
                  secretKey: process.env["PLAYFAB_SECRET_KEY"]?.trim(),
                });
              } catch (contactEmailError) {
                console.error("[PlayFab] Could not sync Google contact email:", contactEmailError);
              }
            }
          }

          const session: SessionData = {
            playFabId: pfData.PlayFabId,
            sessionTicket: pfData.SessionTicket,
            role: "player",
            username: resolvedUsername || resolvedDisplayName,
            playFabUsername: playFabUsername || undefined,
            displayName: resolvedDisplayName,
            email: sessionEmail,
          };

          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies(session)) {
            headers.append("Set-Cookie", cookie);
          }

          const response = {
            success: true,
            session: {
              playFabId: session.playFabId,
              role: session.role,
              username: session.username || session.displayName,
              displayName: session.displayName,
              email: session.email,
            },
            destination: "/portal",
            needsProfileSetup: !credentialsAlreadyLinked,
          };

          return new Response(JSON.stringify(response), { headers });
        } catch (error) {
          console.error("[Auth] Google login error:", error);
          return Response.json(
            { success: false, error: "Unable to complete Google sign-in." } satisfies AuthResponse,
            { status: 500 },
          );
        }
      },
    },
  },
});
