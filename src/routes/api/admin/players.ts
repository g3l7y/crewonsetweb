import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import { PLAYFAB_API_BASE } from '@/lib/playfab/config';
import { getCcoinCurrencyCode } from '@/lib/playfab/economy';
import type { PlayerProfile } from '@/lib/playfab/types';

function getSecretKey(): string | null {
  return process.env['PLAYFAB_SECRET_KEY'] || null;
}

export const Route = createFileRoute('/api/admin/players')({
  server: {
    handlers: {
      /** GET — fetch real players from PlayFab Server API (admin-only). */
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }

        const url = new URL(request.url);
        const playerId = url.searchParams.get('id');
        const secretKey = getSecretKey();

        if (!secretKey) {
          // If server secret key is not configured yet, return empty list honestly
          return Response.json({ success: true, data: playerId ? null : [] });
        }

        try {
          if (playerId) {
            // Fetch single player combined info from PlayFab
            const response = await fetch(`${PLAYFAB_API_BASE}/Server/GetPlayerCombinedInfo`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-SecretKey': secretKey,
              },
              body: JSON.stringify({
                PlayFabId: playerId,
                InfoRequestParameters: {
                  GetPlayerProfile: true,
                  GetUserAccountInfo: true,
                  GetPlayerStatistics: true,
                  GetUserData: true,
                  GetUserInventory: true,
                  GetUserVirtualCurrency: true,
                },
              }),
            });

            const result = await response.json();
            if (!response.ok || result.code !== 200) {
              return Response.json({ success: true, data: null });
            }

            const info = result.data?.InfoResultPayload;
            const profile = info?.PlayerProfile;
            const account = info?.AccountInfo;
            const currencies = info?.UserVirtualCurrency || {};

            return Response.json({
              success: true,
              data: {
                profile: {
                  id: playerId,
                  playFabId: playerId,
                  displayName: profile?.DisplayName || account?.TitleInfo?.DisplayName || 'Player',
                  username: profile?.DisplayName || account?.Username || 'player',
                  email: account?.PrivateInfo?.Email || '',
                  avatarUrl: profile?.AvatarUrl || '/assets/crew-team-illustration.png',
                  role: 'cameraman',
                  crewId: 'CREW-001',
                  bio: '',
                  joinedAt: account?.Created ? new Date(account.Created).toISOString() : new Date().toISOString(),
                  lastLoginAt: account?.TitleInfo?.LastLogin ? new Date(account.TitleInfo.LastLogin).toISOString() : new Date().toISOString(),
                },
                wallet: {
                  bCoins: currencies['BC'] ?? 0,
                  cCoins: currencies[getCcoinCurrencyCode()] ?? 0,
                },
                inventory: info?.UserInventory || [],
                statistics: info?.PlayerStatistics || [],
                userData: info?.UserData || {},
              },
            });
          }

          // Fetch leaderboards to list real active players
          const response = await fetch(`${PLAYFAB_API_BASE}/Server/GetLeaderboard`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-SecretKey': secretKey,
            },
            body: JSON.stringify({
              StatisticName: 'total_xp',
              StartPosition: 0,
              MaxResultsCount: 100,
              ProfileConstraints: {
                ShowDisplayName: true,
                ShowCreated: true,
                ShowLastLogin: true,
              },
            }),
          });

          const result = await response.json();
          if (!response.ok || result.code !== 200 || !result.data?.Leaderboard) {
            // Return empty list if no leaderboard records exist yet
            return Response.json({ success: true, data: [] });
          }

          const players: PlayerProfile[] = result.data.Leaderboard.map((entry: any) => {
            const profile = entry.Profile || {};
            const createdAt = profile.Created ? new Date(profile.Created).toISOString() : '';
            const lastLoginAt = profile.LastLogin ? new Date(profile.LastLogin).toISOString() : '';

            return {
              id: entry.PlayFabId,
              playFabId: entry.PlayFabId,
              displayName: profile.DisplayName || entry.DisplayName || ("Player_" + (entry.Position + 1)),
              username: profile.DisplayName || entry.DisplayName || ("player_" + (entry.Position + 1)),
              email: '',
              avatarUrl: profile.AvatarUrl || '/assets/crew-team-illustration.png',
              role: 'cameraman',
              crewId: 'CREW-001',
              bio: '',
              joinedAt: createdAt,
              lastLoginAt,
            };
          });

          return Response.json({ success: true, data: players });
        } catch (error) {
          console.error('[API] GET admin/players error:', error);
          return Response.json({ success: true, data: playerId ? null : [] });
        }
      },
    },
  },
});
