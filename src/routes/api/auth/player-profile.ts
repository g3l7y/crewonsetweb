import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE, isMockMode } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { validateSessionFromRequest } from "@/lib/playfab/session";

type ProfileMetadata = {
  bio?: string;
  socialLinks?: { twitter?: string; instagram?: string; youtube?: string };
};

async function serverRequest(path: string, body: Record<string, unknown>, secretKey: string) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SecretKey": secretKey,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  return { response, result };
}

export const Route = createFileRoute("/api/auth/player-profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || session.role !== "player") {
          return Response.json({ success: false, error: "You must be signed in as a player." }, { status: 401 });
        }
        if (isMockMode()) {
          return Response.json({ success: false, error: "Live player profiles are unavailable in mock mode." }, { status: 404 });
        }

        const playFabId = new URL(request.url).searchParams.get("playFabId")?.trim() ?? "";
        if (!playFabId || playFabId.length > 100) {
          return Response.json({ success: false, error: "A player id is required." }, { status: 400 });
        }

        const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secretKey) {
          return Response.json({ success: false, error: "PlayFab server configuration is incomplete." }, { status: 503 });
        }

        try {
          const [profileResponse, userDataResponse] = await Promise.all([
            serverRequest("/Server/GetPlayerProfile", {
              PlayFabId: playFabId,
              ProfileConstraints: {
                ShowAvatarUrl: true,
                ShowCreated: true,
                ShowDisplayName: true,
                ShowLastLogin: true,
              },
            }, secretKey),
            serverRequest("/Server/GetUserData", {
              PlayFabId: playFabId,
              Keys: [PLAYFAB_DATA_KEYS.profile_metadata],
            }, secretKey),
          ]);

          if (!profileResponse.response.ok || profileResponse.result.code !== 200) {
            return Response.json({ success: false, error: "Player profile could not be loaded." }, { status: 404 });
          }

          const profile = profileResponse.result.data?.PlayerProfile ?? {};
          const rawMetadata = userDataResponse.result.data?.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          let metadata: ProfileMetadata = {};
          if (typeof rawMetadata === "string" && rawMetadata) {
            try { metadata = JSON.parse(rawMetadata) as ProfileMetadata; } catch { metadata = {}; }
          }

          return Response.json({
            success: true,
            profile: {
              playFabId,
              username: profile.DisplayName || "Player",
              displayName: profile.DisplayName || "Player",
              avatarUrl: profile.AvatarUrl || null,
              bio: typeof metadata.bio === "string" ? metadata.bio : "",
              socialLinks: metadata.socialLinks ?? {},
              joinedAt: profile.Created || null,
            },
          });
        } catch (error) {
          console.error("[PlayFab] Could not load public player profile:", error);
          return Response.json({ success: false, error: "Player profile could not be loaded." }, { status: 502 });
        }
      },
    },
  },
});