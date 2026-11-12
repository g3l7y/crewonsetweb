import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE, isMockMode } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { mapUserDataToAchievements } from "@/lib/playfab/achievements";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { DEFAULT_PROFILE_PICTURE_URL, isManagedProfileAvatarUrl } from "@/lib/profile-avatar";
import { getPublicPlayerLevel } from "@/lib/playfab/public-player-level";

type ProfileMetadata = {
  avatarUrl?: string;
  avatarFileName?: string;
  avatarUpdatedAt?: number;
  bio?: string;
  socialLinks?: { twitter?: string; instagram?: string; youtube?: string };
  profileVisibility?: boolean;
  showCrewActivity?: boolean;
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
        if (!session?.sessionTicket) {
          return Response.json({ success: false, error: "You must be signed in." }, { status: 401 });
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
          const [profileResponse, userDataResponse, level] = await Promise.all([
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
            }, secretKey),
            getPublicPlayerLevel(playFabId, secretKey).catch(() => undefined),
          ]);

          if (!profileResponse.response.ok || profileResponse.result.code !== 200) {
            return Response.json({ success: false, error: "Player profile could not be loaded." }, { status: 404 });
          }
          if (!userDataResponse.response.ok || userDataResponse.result.code !== 200) {
            return Response.json({ success: false, error: "Player profile could not be loaded." }, { status: 502 });
          }

          const profile = profileResponse.result.data?.PlayerProfile ?? {};
          const userData = userDataResponse.result.data?.Data ?? {};
          const rawMetadata = userData[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          let metadata: ProfileMetadata = {};
          if (typeof rawMetadata === "string" && rawMetadata) {
            try { metadata = JSON.parse(rawMetadata) as ProfileMetadata; } catch { metadata = {}; }
          }

          const isOwner = playFabId.toUpperCase() === session.playFabId.toUpperCase();
          const profileVisible = isOwner || metadata.profileVisibility !== false;
          const showCrewActivity = profileVisible && metadata.showCrewActivity !== false;
          const rawSocialLinks = metadata.socialLinks && typeof metadata.socialLinks === "object" ? metadata.socialLinks : {};
          const socialLinks = {
            ...(typeof rawSocialLinks.twitter === "string" ? { twitter: rawSocialLinks.twitter } : {}),
            ...(typeof rawSocialLinks.instagram === "string" ? { instagram: rawSocialLinks.instagram } : {}),
            ...(typeof rawSocialLinks.youtube === "string" ? { youtube: rawSocialLinks.youtube } : {}),
          };
          const achievementData = Object.fromEntries(Object.entries(userData).flatMap(([key, value]) => {
            const text = (value as { Value?: string })?.Value;
            return typeof text === "string" ? [[key, text]] : [];
          }));
          const unlockedAchievements = showCrewActivity
            ? mapUserDataToAchievements(achievementData).filter(achievement => achievement.unlocked)
            : [];

          return Response.json({
            success: true,
            profile: {
              playFabId,
              username: profile.DisplayName || "Player",
              displayName: profile.DisplayName || "Player",
              ...(level !== undefined ? { level } : {}),
              avatarUrl: isManagedProfileAvatarUrl(metadata.avatarUrl) ? metadata.avatarUrl : DEFAULT_PROFILE_PICTURE_URL,
              profileVisible,
              showCrewActivity,
              ...(profileVisible ? {
                bio: typeof metadata.bio === "string" ? metadata.bio : "",
                socialLinks,
              } : {}),
              ...(showCrewActivity ? { achievements: unlockedAchievements } : {}),
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
