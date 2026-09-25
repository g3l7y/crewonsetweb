import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE, isMockMode } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { DEFAULT_PROFILE_PICTURE_URL, getProfileAvatarUrl } from "@/lib/profile-avatar";
import { uploadProfileAvatar } from "@/lib/playfab/profile-avatars";

type ProfileMetadata = Record<string, unknown> & {
  avatarUrl?: string;
  avatarFileName?: string;
  avatarUpdatedAt?: number;
};

async function serverRequest<T>(path: string, body: Record<string, unknown>, secretKey: string): Promise<T> {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify(body),
  });
  const result = await response.json() as { code?: number; data?: T; errorMessage?: string };
  if (!response.ok || result.code !== 200 || result.data === undefined) {
    throw new Error(result.errorMessage || `PlayFab request failed: ${path}`);
  }
  return result.data;
}

export const Route = createFileRoute("/api/auth/avatar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || session.role !== "player" || !session.playFabId) {
          return Response.json({ success: false, error: "You must be signed in as a player." }, { status: 401 });
        }
        if (isMockMode()) {
          return Response.json({ success: false, error: "Mock avatars are saved in the local player profile." }, { status: 400 });
        }

        const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secretKey) {
          return Response.json({ success: false, error: "PlayFab server configuration is incomplete." }, { status: 503 });
        }

        try {
          const form = await request.formData();
          const reset = form.get("reset") === "true";
          const candidate = form.get("avatar");
          const file = candidate && typeof candidate !== "string" && typeof candidate.arrayBuffer === "function"
            ? candidate as File
            : null;
          if (!reset && !file) {
            return Response.json({ success: false, error: "Choose a JPG or PNG image." }, { status: 400 });
          }
          if (file && !["image/jpeg", "image/png"].includes(file.type)) {
            return Response.json({ success: false, error: "Please select a JPG or PNG image." }, { status: 400 });
          }
          if (file && (file.size === 0 || file.size > 5 * 1024 * 1024)) {
            return Response.json({ success: false, error: "Avatar must be larger than 0 bytes and no larger than 5 MB." }, { status: 400 });
          }

          const avatarFileName = reset ? undefined : await uploadProfileAvatar(session.playFabId, file!, secretKey);
          const avatarUpdatedAt = Date.now();
          const avatarUrl = reset
            ? new URL(DEFAULT_PROFILE_PICTURE_URL, request.url).toString()
            : new URL(getProfileAvatarUrl(session.playFabId, avatarUpdatedAt), request.url).toString();

          const userData = await serverRequest<{
            Data?: Record<string, { Value?: string }>;
          }>("/Server/GetUserData", {
            PlayFabId: session.playFabId,
            Keys: [PLAYFAB_DATA_KEYS.profile_metadata],
          }, secretKey);
          const rawMetadata = userData.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          let metadata: ProfileMetadata = {};
          if (rawMetadata) {
            try { metadata = JSON.parse(rawMetadata) as ProfileMetadata; } catch { metadata = {}; }
          }
          const updatedMetadata: ProfileMetadata = {
            ...metadata,
            avatarUrl,
            avatarUpdatedAt,
            ...(avatarFileName ? { avatarFileName } : {}),
          };
          if (reset) delete updatedMetadata.avatarFileName;

          await serverRequest("/Server/UpdateUserData", {
            PlayFabId: session.playFabId,
            Data: { [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify(updatedMetadata) },
            Permission: "Public",
          }, secretKey);
          await serverRequest("/Server/UpdateAvatarUrl", {
            PlayFabId: session.playFabId,
            ImageUrl: avatarUrl,
          }, secretKey);

          return Response.json({ success: true, avatarUrl, avatarUpdatedAt });
        } catch (error) {
          console.error("[PlayFab] Could not update the player avatar:", error);
          return Response.json({
            success: false,
            error: error instanceof Error ? error.message : "The avatar could not be saved.",
          }, { status: 502 });
        }
      },
    },
  },
});
