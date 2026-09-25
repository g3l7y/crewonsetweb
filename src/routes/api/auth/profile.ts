import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE, isMockMode } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { createSessionCookies, validateSessionFromRequest } from "@/lib/playfab/session";
import { getMockAccountBySessionTicket, isMockUsernameTaken, updateMockAccountUsername } from "@/lib/playfab/mock-accounts";
import { isValidEmail, isValidUsername, EMAIL_ERROR, USERNAME_ERROR } from "@/lib/validation";
import { findPlayFabAccountByIdentifier, verifyPlayFabCurrentPassword } from "@/lib/playfab/credential-verification";

type ProfileMetadata = {
  username?: string;
  email?: string;
  googleProfileSetup?: boolean;
  bio?: string;
  avatarUrl?: string;
  avatarFileName?: string;
  avatarUpdatedAt?: number;
  socialLinks?: { twitter?: string; instagram?: string; youtube?: string };
  showStatus?: boolean;
};

async function playFabClientRequest(path: string, sessionTicket: string, body: Record<string, unknown>) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.code !== 200) throw new Error(result.errorMessage ?? "PlayFab could not save your profile.");
  return result.data;
}

export const Route = createFileRoute("/api/auth/profile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || session.role !== "player") {
          return Response.json({ success: false, error: "You must be signed in as a player." }, { status: 401 });
        }

        const body = (await request.json()) as { username?: string; email?: string; currentPassword?: string; bio?: string; socialLinks?: ProfileMetadata["socialLinks"] };
        const username = body.username?.trim() ?? "";
        const email = body.email?.trim().toLowerCase() ?? "";
        if (username && !isValidUsername(username)) return Response.json({ success: false, error: USERNAME_ERROR }, { status: 400 });
        if (email && !isValidEmail(email)) return Response.json({ success: false, error: EMAIL_ERROR }, { status: 400 });
        if (email) return Response.json({ success: false, error: "Email changes require verification from your current email. Use the email-change link in Account Settings." }, { status: 400 });
        if (!username && !email && body.bio === undefined && !body.socialLinks) {
          return Response.json({ success: false, error: "A profile field is required." }, { status: 400 });
        }

        const credentialChange = Boolean(username);
        if (credentialChange && !body.currentPassword) {
          return Response.json({ success: false, error: "Enter your current password before changing account credentials." }, { status: 400 });
        }

        if (isMockMode()) {
          const account = getMockAccountBySessionTicket(session.sessionTicket);
          if (!account) return Response.json({ success: false, error: "Session expired. Please sign in again." }, { status: 401 });
          if (credentialChange && account.password !== body.currentPassword) {
            return Response.json({ success: false, error: "Current password is incorrect." }, { status: 401 });
          }
          if (username && username.toLowerCase() !== account.username.toLowerCase() && isMockUsernameTaken(username)) {
            return Response.json({ success: false, error: "That username is already in use. Please choose another." }, { status: 409 });
          }
          if (username) {
            const updatedUsername = updateMockAccountUsername(session.sessionTicket, username);
            if (!updatedUsername.success) return Response.json(updatedUsername, { status: 409 });
          }
          const updatedAccount = getMockAccountBySessionTicket(session.sessionTicket);
          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies({
            ...session,
            username: updatedAccount?.username ?? session.username,
            displayName: updatedAccount?.displayName ?? session.displayName,
            email: session.email,
          })) headers.append("Set-Cookie", cookie);
          return new Response(JSON.stringify({ success: true, username: updatedAccount?.username, email: updatedAccount?.email }), { headers });
        }

        try {
          if (credentialChange && !(await verifyPlayFabCurrentPassword(session, body.currentPassword ?? ""))) {
            return Response.json({ success: false, error: "Current password is incorrect." }, { status: 401 });
          }

          if (username) {
            const existing = await findPlayFabAccountByIdentifier(username);
            if (existing && existing.playFabId !== session.playFabId) {
              return Response.json({ success: false, error: "That username is already in use. Please choose another." }, { status: 409 });
            }
          }

          const userData = await playFabClientRequest("/Client/GetUserData", session.sessionTicket, { Keys: [PLAYFAB_DATA_KEYS.profile_metadata] });
          let metadata: ProfileMetadata = {};
          const rawMetadata = userData?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          if (rawMetadata) {
            try { metadata = JSON.parse(rawMetadata) as ProfileMetadata; } catch { metadata = {}; }
          }
          const updatedMetadata: ProfileMetadata = {
            ...metadata,
            ...(username ? { username } : {}),
            ...(body.bio !== undefined ? { bio: body.bio } : {}),
            ...(body.socialLinks ? { socialLinks: body.socialLinks } : {}),
            googleProfileSetup: true,
          };
          await playFabClientRequest("/Client/UpdateUserData", session.sessionTicket, {
            Data: { [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify(updatedMetadata) },
          });
          if (username) {
            try {
              await playFabClientRequest("/Client/UpdateUserTitleDisplayName", session.sessionTicket, { DisplayName: username });
            } catch (error) {
              await playFabClientRequest("/Client/UpdateUserData", session.sessionTicket, {
                Data: { [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify(metadata) },
              }).catch(() => undefined);
              throw error;
            }
          }

          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies({
            ...session,
            username: username || session.username,
            displayName: username || session.displayName,
            email: session.email,
          })) headers.append("Set-Cookie", cookie);
          return new Response(JSON.stringify({ success: true, username: username || session.username, email: session.email }), { headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : "PlayFab could not save your profile.";
          const status = /name|display|email/i.test(message) ? 409 : 400;
          return Response.json({ success: false, error: message }, { status });
        }
      },
    },
  },
});
