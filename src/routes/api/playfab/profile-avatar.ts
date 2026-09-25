import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { getProfileAvatarFile } from "@/lib/playfab/profile-avatars";

type ProfileMetadata = { avatarFileName?: string };

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

export const Route = createFileRoute("/api/playfab/profile-avatar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const playFabId = url.searchParams.get("playFabId")?.trim() ?? "";
        if (!/^[a-z0-9_-]{1,100}$/i.test(playFabId)) {
          return Response.json({ error: "Player id is invalid." }, { status: 400 });
        }

        const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secretKey) return Response.json({ error: "Avatar storage is unavailable." }, { status: 503 });

        try {
          const userData = await serverRequest<{
            Data?: Record<string, { Value?: string }>;
          }>("/Server/GetUserData", {
            PlayFabId: playFabId,
            Keys: [PLAYFAB_DATA_KEYS.profile_metadata],
          }, secretKey);
          const rawMetadata = userData.Data?.[PLAYFAB_DATA_KEYS.profile_metadata]?.Value;
          let metadata: ProfileMetadata = {};
          if (rawMetadata) {
            try { metadata = JSON.parse(rawMetadata) as ProfileMetadata; } catch { metadata = {}; }
          }
          const fileName = metadata.avatarFileName;
          if (!fileName) return new Response(null, { status: 404 });

          const file = await getProfileAvatarFile(playFabId, fileName, secretKey);
          if (!file?.DownloadUrl) return new Response(null, { status: 404 });
          const image = await fetch(file.DownloadUrl);
          if (!image.ok || !image.body) return new Response(null, { status: 502 });

          const headers = new Headers({
            "Content-Type": fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            "X-Content-Type-Options": "nosniff",
          });
          const contentLength = file.Size ?? Number(image.headers.get("content-length"));
          if (Number.isFinite(contentLength) && contentLength > 0) headers.set("Content-Length", String(contentLength));
          return new Response(image.body, { headers });
        } catch (error) {
          console.error("[PlayFab] Could not load the player avatar:", error);
          return Response.json({ error: "Avatar image could not be loaded." }, { status: 502 });
        }
      },
    },
  },
});
