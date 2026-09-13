import { playfabClientApi } from './client';
import type { LeaderboardEntry } from './types';

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
    const data = await playfabClientApi<{
      Leaderboard: any[];
    }>('/Client/GetLeaderboard', {
      StatisticName: statisticName,
      StartPosition: startPosition,
      MaxResultsCount: maxResults,
    }, sessionTicket);

    return (data.Leaderboard || []).map((entry: any) => ({
      playFabId: entry.PlayFabId,
      displayName: entry.DisplayName || 'Unknown',
      statValue: entry.StatValue,
      position: entry.Position,
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
    const data = await playfabClientApi<{
      Leaderboard: any[];
    }>('/Client/GetLeaderboardAroundPlayer', {
      StatisticName: statisticName,
      MaxResultsCount: maxResults,
    }, sessionTicket);

    return (data.Leaderboard || []).map((entry: any) => ({
      playFabId: entry.PlayFabId,
      displayName: entry.DisplayName || 'Unknown',
      statValue: entry.StatValue,
      position: entry.Position,
    })) as LeaderboardEntry[];
  } catch (error) {
    return [];
  }
}
