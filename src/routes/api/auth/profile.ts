import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID, isMockMode } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { isValidUsername, USERNAME_ERROR } from "@/lib/validation";

type ProfileMetadata = {
  username?: string;
  googleProfileSetup?: boolean;
  bio?: string;
  socialLinks?: { twitter?: string; instagram?: string; youtube?: string };
  showStatus?: boolean;
};

async function playFabClientRequest(
  path: string,
  sessionTicket: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Authorization": sessionTicket,
    },
    body: JSON.stringify({ TitleId: PLAYFAB_TITLE_ID, ...body }),
  });
  const result = await response.json();
  if (!response.ok || result.code !== 200) {
    throw new Error(result.errorMessage ?? "PlayFab could not save your profile.");
  }
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

        const body = (await request.json()) as { username?: string };
        const username = body.username?.trim() ?? "";
        if (!isValidUsername(username)) {
          return Response.json({ success: false, error: USERNAME_ERROR }, { status: 400 });
        }

        if (isMockMode()) {
          return Response.json({ success: true, username });
        }

        try {
          await playFabClientRequest("/Client/UpdateUserTitleDisplayName", session.sessionTicket, {
            DisplayName: username,
          });

          const userData = await playFabClientRequest("/Client/GetUserData", session.sessionTicket, {
            Keys: [PLAYFAB_DATA_KEYS.profile_metadata],
          });
          let metadata: ProfileMetadata = {};
          const rawMetadata = userData?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          if (rawMetadata) {
            try {
              metadata = JSON.parse(rawMetadata) as ProfileMetadata;
            } catch {
              metadata = {};
            }
          }

          await playFabClientRequest("/Client/UpdateUserData", session.sessionTicket, {
            Data: {
              [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify({
                ...metadata,
                username,
                googleProfileSetup: true,
              }),
            },
          });

          return Response.json({ success: true, username });
        } catch (error) {
          const message = error instanceof Error ? error.message : "PlayFab could not save your profile.";
          const status = /name|display/i.test(message) ? 409 : 400;
          return Response.json({ success: false, error: message }, { status });
        }
      },
    },
  },
});
