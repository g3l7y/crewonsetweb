import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE, isMockMode } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { findPlayFabAccountByIdentifier } from "@/lib/playfab/credential-verification";
import { createSessionCookies, validateSessionFromRequest } from "@/lib/playfab/session";
import {
  getMockAccountBySessionTicket,
  markMockGoogleProfileSetup,
  updateMockAccountPassword,
  updateMockAccountUsername,
} from "@/lib/playfab/mock-accounts";
import { isValidPassword, isValidUsername, PASSWORD_ERROR, USERNAME_ERROR } from "@/lib/validation";

async function playFabClientRequest(
  path: string,
  sessionTicket: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 200) {
    if ([1006, 1009].includes(Number(result.errorCode))) {
      throw new Error("That username or email is already in use. Please choose another.");
    }
    if (Number(result.errorCode) === 1008) throw new Error(PASSWORD_ERROR);
    throw new Error(result.errorMessage ?? "PlayFab could not save your profile.");
  }
  return result.data;
}

export const Route = createFileRoute("/api/auth/profile/setup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || session.role !== "player") {
          return Response.json(
            { success: false, error: "You must be signed in as a player." },
            { status: 401 },
          );
        }
        const body = (await request.json()) as { username?: string; password?: string };
        const username = body.username?.trim() ?? "";
        const password = body.password ?? "";
        if (!isValidUsername(username)) {
          return Response.json({ success: false, error: USERNAME_ERROR }, { status: 400 });
        }
        if (!isValidPassword(password)) {
          return Response.json({ success: false, error: PASSWORD_ERROR }, { status: 400 });
        }

        if (isMockMode()) {
          const account = getMockAccountBySessionTicket(session.sessionTicket);
          if (
            !account ||
            account.role !== "player" ||
            account.googleProfileSetupPending !== true ||
            account.googleProfileSetup === true
          ) {
            return Response.json(
              {
                success: false,
                error: "Profile setup is only available for a new Google account.",
              },
              { status: 403 },
            );
          }
          const updatedUsername = updateMockAccountUsername(session.sessionTicket, username);
          if (!updatedUsername.success) return Response.json(updatedUsername, { status: 409 });
          const updatedPassword = updateMockAccountPassword(session.sessionTicket, password);
          if (!updatedPassword.success) return Response.json(updatedPassword, { status: 400 });
          markMockGoogleProfileSetup(session.sessionTicket);

          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies({
            ...session,
            username,
            playFabUsername: username,
            displayName: username,
          }))
            headers.append("Set-Cookie", cookie);
          return new Response(JSON.stringify({ success: true, username }), { headers });
        }

        try {
          const userData = await playFabClientRequest(
            "/Client/GetUserData",
            session.sessionTicket,
            {
              Keys: [PLAYFAB_DATA_KEYS.profile_metadata],
            },
          );
          const rawMetadata = userData?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          let metadata: Record<string, unknown> = {};
          if (typeof rawMetadata === "string" && rawMetadata) {
            try {
              metadata = JSON.parse(rawMetadata) as Record<string, unknown>;
            } catch {
              metadata = {};
            }
          }
          if (metadata.googleProfileSetupPending !== true || metadata.googleProfileSetup === true) {
            return Response.json(
              {
                success: false,
                error: "Profile setup is only available for a new Google account.",
              },
              { status: 403 },
            );
          }
          const existing = await findPlayFabAccountByIdentifier(username);
          if (existing && existing.playFabId !== session.playFabId) {
            return Response.json(
              { success: false, error: "That username is already in use. Please choose another." },
              { status: 409 },
            );
          }

          const currentAccount = await playFabClientRequest(
            "/Client/GetAccountInfo",
            session.sessionTicket,
            {},
          );
          const accountInfo = currentAccount?.AccountInfo;
          const linkedUsername =
            typeof accountInfo?.Username === "string" ? accountInfo.Username.trim() : "";
          if (linkedUsername && linkedUsername.toLowerCase() !== username.toLowerCase()) {
            return Response.json(
              {
                success: false,
                error: "A different username is already linked to this account.",
              },
              { status: 409 },
            );
          }
          const loginEmail = String(accountInfo?.PrivateInfo?.Email ?? session.email ?? "")
            .trim()
            .toLowerCase();
          if (!loginEmail) {
            return Response.json(
              {
                success: false,
                error:
                  "Your Google account email could not be verified. Sign in again or use email sign-up.",
              },
              { status: 400 },
            );
          }

          // Attach PlayFab username/password authentication to the same account
          // that was created or opened with Google; this does not create a
          // second player profile.
          if (!linkedUsername) {
            await playFabClientRequest("/Client/AddUsernamePassword", session.sessionTicket, {
              Email: loginEmail,
              Username: username,
              Password: password,
            });
          }

          await playFabClientRequest("/Client/UpdateUserTitleDisplayName", session.sessionTicket, {
            DisplayName: username,
          });
          await playFabClientRequest("/Client/UpdateUserData", session.sessionTicket, {
            Data: {
              [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify({
                ...metadata,
                username,
                googleProfileSetup: true,
                googleProfileSetupPending: false,
                credentialsSetup: true,
              }),
            },
          });

          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies({
            ...session,
            username,
            playFabUsername: username,
            displayName: username,
          }))
            headers.append("Set-Cookie", cookie);
          return new Response(JSON.stringify({ success: true, username }), { headers });
        } catch (error) {
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "Unable to save your username.",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
