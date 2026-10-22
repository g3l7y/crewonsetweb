import { createFileRoute } from "@tanstack/react-router";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { PLAYFAB_API_BASE } from "@/lib/playfab/config";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { GAME_APPEARANCE_KEY, gameAppearanceToLoadout } from "@/lib/playfab/game-appearance";

export const Route = createFileRoute("/api/playfab/player-avatar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket) return unauthorizedSessionResponse(401);
        const playFabId = new URL(request.url).searchParams.get("playFabId")?.trim() ?? "";
        if (!/^[a-z0-9_-]{1,100}$/i.test(playFabId)) {
          return Response.json({ success: false, error: "Player id is invalid." }, { status: 400 });
        }
        const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secretKey) return Response.json({ success: false, error: "Avatar data is unavailable." }, { status: 503 });
        try {
          const response = await fetch(`${PLAYFAB_API_BASE}/Server/GetUserData`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
            body: JSON.stringify({ PlayFabId: playFabId, Keys: [GAME_APPEARANCE_KEY, PLAYFAB_DATA_KEYS.loadout] }),
          });
          const result = await response.json() as { code?: number; data?: { Data?: Record<string, { Value?: string }> } };
          if (!response.ok || result.code !== 200) return Response.json({ success: false }, { status: 502 });
          const data = result.data?.Data ?? {};
          let loadout: Record<string, string> = {};
          const appearance = data[GAME_APPEARANCE_KEY]?.Value;
          const savedLoadout = data[PLAYFAB_DATA_KEYS.loadout]?.Value;
          let hasCurrentAppearance = false;
          if (appearance) {
            try {
              loadout = gameAppearanceToLoadout(JSON.parse(appearance));
              hasCurrentAppearance = true;
            } catch { /* use the legacy loadout below */ }
          }
          if (!hasCurrentAppearance && savedLoadout) {
            try {
              const parsed = JSON.parse(savedLoadout);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                loadout = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
              }
            } catch { /* malformed legacy data falls back to the saved profile picture */ }
          }
          return Response.json({ success: true, loadout }, { headers: { "Cache-Control": "private, max-age=30" } });
        } catch (error) {
          console.error("[PlayFab] Could not load player avatar appearance:", error);
          return Response.json({ success: false }, { status: 502 });
        }
      },
    },
  },
});
