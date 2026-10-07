import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE, isMockMode } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import {
  deletePlayerEmailIdentity,
  findEmailLoginAlias,
  isEmailLoginIdentityStoreConfigured,
  saveEmailLoginAlias,
} from "@/lib/playfab/email-login-identities";
import { createSessionCookies, validateSessionFromRequest } from "@/lib/playfab/session";
import {
  getMockAccountBySessionTicket,
  markMockGoogleProfileSetup,
  updateMockAccountPassword,
  updateMockAccountUsername,
} from "@/lib/playfab/mock-accounts";
import { isValidPassword, isValidUsername, PASSWORD_ERROR, USERNAME_ERROR } from "@/lib/validation";

class PlayFabClientError extends Error {
  constructor(
    message: string,
    readonly errorCode?: number,
  ) {
    super(message);
    this.name = "PlayFabClientError";
  }
}

async function findEmailAccountOwner(email: string): Promise<string | null> {
  const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
  if (!secretKey) throw new Error("Email ownership could not be verified. Try again shortly.");
  const response = await fetch(`${PLAYFAB_API_BASE}/Admin/GetUserAccountInfo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify({ Email: email }),
  });
  const result = await response.json().catch(() => ({}));
  if (response.ok && result.code === 200) {
    const userInfo = result.data?.UserInfo?.AccountInfo ?? result.data?.UserInfo;
    const playFabId = userInfo?.PlayFabId ?? result.data?.AccountInfo?.PlayFabId;
    return typeof playFabId === "string" ? playFabId : null;
  }
  if (Number(result.errorCode) === 1001) return null;
  throw new Error("Email ownership could not be verified. Try again shortly.");
}

async function isPlayFabAccountDeleted(playFabId: string): Promise<boolean> {
  const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
  if (!secretKey) throw new Error("Email ownership could not be verified. Try again shortly.");
  const response = await fetch(`${PLAYFAB_API_BASE}/Admin/GetUserAccountInfo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify({ PlayFabId: playFabId }),
  });
  const result = await response.json().catch(() => ({}));
  if (response.ok && result.code === 200) return false;
  if (Number(result.errorCode) === 1001) return true;
  if (Number(result.errorCode) === 1322) {
    throw new Error(
      "PlayFab is still finishing deletion of an account linked to this email. Try again after the deletion is complete.",
    );
  }
  throw new Error("Email ownership could not be verified. Try again shortly.");
}

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
    throw new PlayFabClientError(
      result.errorMessage ?? "PlayFab could not save your profile.",
      Number(result.errorCode),
    );
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
          const googleEmail = String(accountInfo?.GoogleInfo?.GoogleEmail ?? "")
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
            try {
              await playFabClientRequest("/Client/AddUsernamePassword", session.sessionTicket, {
                Email: loginEmail,
                Username: username,
                Password: password,
              });
            } catch (error) {
              if (!(error instanceof PlayFabClientError) || error.errorCode !== 1006) throw error;

              // Google sign-in can already own this email on the same PlayFab
              // account. PlayFab's AddUsernamePassword endpoint still rejects
              // that address, so use a private, non-deliverable login address
              // and keep the real email as this player's website login alias.
              const [emailOwner, resolvedAlias] = await Promise.all([
                findEmailAccountOwner(loginEmail),
                isEmailLoginIdentityStoreConfigured() ? findEmailLoginAlias(loginEmail) : null,
              ]);
              let emailAlias = resolvedAlias;
              if (emailAlias && (await isPlayFabAccountDeleted(emailAlias.playfab_id))) {
                await deletePlayerEmailIdentity(emailAlias.playfab_id);
                emailAlias = null;
              }
              const ownerIsAnotherPlayer = [emailOwner, emailAlias?.playfab_id].some(
                (ownerId) => ownerId && ownerId !== session.playFabId,
              );
              if (
                ownerIsAnotherPlayer ||
                (!emailOwner && !emailAlias && googleEmail !== loginEmail)
              ) {
                throw new Error("That email is already in use. Please choose another.");
              }
              if (!isEmailLoginIdentityStoreConfigured()) {
                throw new Error(
                  "Email sign-in for Google accounts is not configured. Please contact support or continue signing in with Google.",
                );
              }

              const internalLoginEmail = `player-${session.playFabId.toLowerCase()}@login.crewonset.invalid`;
              await playFabClientRequest("/Client/AddUsernamePassword", session.sessionTicket, {
                Email: internalLoginEmail,
                Username: username,
                Password: password,
              });
            }
          }

          // The site resolves this verified address to the PlayFab username
          // before checking the password. This also keeps email login working
          // when PlayFab's own login email must be an internal alias.
          if (isEmailLoginIdentityStoreConfigured()) {
            await saveEmailLoginAlias(loginEmail, session.playFabId, "player");
          }

          await playFabClientRequest("/Client/UpdateUserTitleDisplayName", session.sessionTicket, {
            DisplayName: username,
          });
          await playFabClientRequest("/Client/UpdateUserData", session.sessionTicket, {
            Data: {
              [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify({
                ...metadata,
                username,
                email: loginEmail,
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
          const errorCode = error instanceof PlayFabClientError ? error.errorCode : undefined;
          const errorMessage =
            errorCode === 1006
              ? "That email is already in use. Please choose another."
              : errorCode === 1009
                ? "That username is already in use. Please choose another."
                : errorCode === 1008
                  ? PASSWORD_ERROR
                  : errorCode === 1322
                    ? "An account linked to this email is still being closed. Please try again shortly."
                    : error instanceof Error
                      ? "We couldn't save your profile. Please try again."
                      : "Unable to save your username.";
          return Response.json(
            {
              success: false,
              error: errorMessage,
            },
            {
              status:
                /already in use/.test(errorMessage) || errorCode === 1009 || errorCode === 1322
                  ? 409
                  : 400,
            },
          );
        }
      },
    },
  },
});
