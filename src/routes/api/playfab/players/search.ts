import { createFileRoute } from '@tanstack/react-router';
import { PLAYFAB_API_BASE } from '@/lib/playfab/config';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import { DEFAULT_PROFILE_PICTURE_URL, isManagedProfileAvatarUrl } from '@/lib/profile-avatar';

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
    avatarUrl: isManagedProfileAvatarUrl(account.TitleInfo?.AvatarUrl) ? account.TitleInfo?.AvatarUrl : DEFAULT_PROFILE_PICTURE_URL,
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

            if (account && playfabResponse.ok && result?.code === 200 && playFabId && playFabId !== session.playFabId) {
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
