import { createFileRoute } from '@tanstack/react-router';
import { PLAYFAB_API_BASE } from '@/lib/playfab/config';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';

type PlayFabAccountInfo = {
  PlayFabId?: string;
  Username?: string;
  TitleInfo?: {
    DisplayName?: string;
    AvatarUrl?: string;
  };
};

function publicPlayer(account: PlayFabAccountInfo) {
  const displayName = account.TitleInfo?.DisplayName || account.Username || 'Player';
  return {
    playFabId: account.PlayFabId ?? '',
    username: displayName,
    displayName,
    avatarUrl: account.TitleInfo?.AvatarUrl ?? null,
    level: 1,
    role: 'Crew Member',
    online: false,
  };
}

export const Route = createFileRoute('/api/playfab/players/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket) {
          return unauthorizedSessionResponse(401);
        }

        const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
        if (query.length < 3 || query.length > 64) {
          return Response.json({ success: true, data: [] });
        }

        // A username created by this app is stored as the title display name.
        // Username is included as a fallback for accounts created directly in
        // PlayFab with a PlayFab username.
        for (const lookup of [{ TitleDisplayName: query }, { Username: query }]) {
          try {
            const playfabResponse = await fetch(`${PLAYFAB_API_BASE}/Client/GetAccountInfo`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Authorization': session.sessionTicket,
              },
              body: JSON.stringify(lookup),
            });
            const result = await playfabResponse.json();
            const account = result?.data?.AccountInfo as PlayFabAccountInfo | undefined;
            const playFabId = account?.PlayFabId ?? '';

            if (playfabResponse.ok && result?.code === 200 && playFabId && playFabId !== session.playFabId) {
              return Response.json({ success: true, data: [publicPlayer(account)] });
            }
          } catch {
            // Try the other supported PlayFab identifier before returning no match.
          }
        }

        return Response.json({ success: true, data: [] });
      },
    },
  },
});
