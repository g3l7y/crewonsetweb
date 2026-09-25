import { playfabClientApi } from './client';
import type { LeaderboardEntry } from './types';
import { DEFAULT_PROFILE_PICTURE_URL, isManagedProfileAvatarUrl } from '../profile-avatar';

/**
 * Get a global leaderboard.
 */
export async function getGlobalLeaderboard(
  statisticName: string,
  startPosition: number,
  maxResults: number,
  sessionTicket: string
): Promise<LeaderboardEntry[]> {
  try {
    let data: { Leaderboard: any[] };
    try {
      data = await playfabClientApi<{ Leaderboard: any[] }>('/Client/GetLeaderboard', {
        StatisticName: statisticName,
        StartPosition: startPosition,
        MaxResultsCount: maxResults,
        ProfileConstraints: { ShowAvatarUrl: true },
      }, sessionTicket);
    } catch {
      data = await playfabClientApi<{ Leaderboard: any[] }>('/Client/GetLeaderboard', {
        StatisticName: statisticName,
        StartPosition: startPosition,
        MaxResultsCount: maxResults,
      }, sessionTicket);
    }

    return (data.Leaderboard || []).map((entry: any) => ({
      playFabId: entry.PlayFabId,
      username: entry.DisplayName || entry.Username || 'Unknown',
      displayName: entry.DisplayName || 'Unknown',
      statValue: entry.StatValue,
      position: entry.Position,
      avatarUrl: isManagedProfileAvatarUrl(entry.Profile?.AvatarUrl) ? entry.Profile.AvatarUrl : DEFAULT_PROFILE_PICTURE_URL,
    })) as LeaderboardEntry[];
  } catch (error) {
    return [];
  }
}

/**
 * Get the leaderboard centered around the current player.
 */
export async function getLeaderboardAroundPlayer(
  statisticName: string,
  maxResults: number,
  sessionTicket: string
): Promise<LeaderboardEntry[]> {
  try {
    let data: { Leaderboard: any[] };
    try {
      data = await playfabClientApi<{ Leaderboard: any[] }>('/Client/GetLeaderboardAroundPlayer', {
        StatisticName: statisticName,
        MaxResultsCount: maxResults,
        ProfileConstraints: { ShowAvatarUrl: true },
      }, sessionTicket);
    } catch {
      data = await playfabClientApi<{ Leaderboard: any[] }>('/Client/GetLeaderboardAroundPlayer', {
        StatisticName: statisticName,
        MaxResultsCount: maxResults,
      }, sessionTicket);
    }

    return (data.Leaderboard || []).map((entry: any) => ({
      playFabId: entry.PlayFabId,
      username: entry.DisplayName || entry.Username || 'Unknown',
      displayName: entry.DisplayName || 'Unknown',
      statValue: entry.StatValue,
      position: entry.Position,
      avatarUrl: isManagedProfileAvatarUrl(entry.Profile?.AvatarUrl) ? entry.Profile.AvatarUrl : DEFAULT_PROFILE_PICTURE_URL,
    })) as LeaderboardEntry[];
  } catch (error) {
    return [];
  }
}
