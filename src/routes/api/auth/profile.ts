import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE, isMockMode } from "@/lib/playfab/config";
import { syncPlayFabContactEmail } from "@/lib/playfab/contact-email";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { createSessionCookies, validateSessionFromRequest } from "@/lib/playfab/session";
import { getMockAccountBySessionTicket, updateMockAccountEmail, updateMockAccountUsername } from "@/lib/playfab/mock-accounts";
import { isValidEmail, isValidUsername, EMAIL_ERROR, USERNAME_ERROR } from "@/lib/validation";

type ProfileMetadata = {
  username?: string;
  email?: string;
  googleProfileSetup?: boolean;
  bio?: string;
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

        const body = (await request.json()) as { username?: string; email?: string; bio?: string; socialLinks?: ProfileMetadata["socialLinks"] };
        const username = body.username?.trim() ?? "";
        const email = body.email?.trim().toLowerCase() ?? "";
        if (username && !isValidUsername(username)) return Response.json({ success: false, error: USERNAME_ERROR }, { status: 400 });
        if (email && !isValidEmail(email)) return Response.json({ success: false, error: EMAIL_ERROR }, { status: 400 });
        if (!username && !email && body.bio === undefined && !body.socialLinks) {
          return Response.json({ success: false, error: "A profile field is required." }, { status: 400 });
        }

        if (isMockMode()) {
          const account = getMockAccountBySessionTicket(session.sessionTicket);
          if (!account) return Response.json({ success: false, error: "Session expired. Please sign in again." }, { status: 401 });
          if (username) {
            const updatedUsername = updateMockAccountUsername(session.sessionTicket, username);
            if (!updatedUsername.success) return Response.json(updatedUsername, { status: 409 });
          }
          if (email) {
            const updatedEmail = updateMockAccountEmail(session.sessionTicket, email);
            if (!updatedEmail.success) return Response.json(updatedEmail, { status: 409 });
          }
          const updatedAccount = getMockAccountBySessionTicket(session.sessionTicket);
          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies({
            ...session,
            username: updatedAccount?.username ?? session.username,
            displayName: updatedAccount?.displayName ?? session.displayName,
            email: updatedAccount?.email ?? session.email,
          })) headers.append("Set-Cookie", cookie);
          return new Response(JSON.stringify({ success: true, username: updatedAccount?.username, email: updatedAccount?.email }), { headers });
        }

        try {
          if (username) {
            await playFabClientRequest("/Client/UpdateUserTitleDisplayName", session.sessionTicket, { DisplayName: username });
          }
          if (email) {
            await syncPlayFabContactEmail(session.sessionTicket, email, {
              playFabId: session.playFabId,
              secretKey: process.env["PLAYFAB_SECRET_KEY"]?.trim(),
            });
          }

          const userData = await playFabClientRequest("/Client/GetUserData", session.sessionTicket, { Keys: [PLAYFAB_DATA_KEYS.profile_metadata] });
          let metadata: ProfileMetadata = {};
          const rawMetadata = userData?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          if (rawMetadata) {
            try { metadata = JSON.parse(rawMetadata) as ProfileMetadata; } catch { metadata = {}; }
          }
          await playFabClientRequest("/Client/UpdateUserData", session.sessionTicket, {
            Data: {
              [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify({
                ...metadata,
                ...(username ? { username } : {}),
                ...(email ? { email } : {}),
                ...(body.bio !== undefined ? { bio: body.bio } : {}),
                ...(body.socialLinks ? { socialLinks: body.socialLinks } : {}),
                googleProfileSetup: true,
              }),
            },
          });

          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies({
            ...session,
            username: username || session.username,
            displayName: username || session.displayName,
            email: email || session.email,
          })) headers.append("Set-Cookie", cookie);
          return new Response(JSON.stringify({ success: true, username: username || session.username, email: email || session.email }), { headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : "PlayFab could not save your profile.";
          const status = /name|display|email/i.test(message) ? 409 : 400;
          return Response.json({ success: false, error: message }, { status });
        }
      },
    },
  },
});
