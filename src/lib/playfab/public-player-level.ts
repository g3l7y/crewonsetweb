import { PLAYFAB_API_BASE } from './config';
import { PLAYFAB_DATA_KEYS } from './constants';
import { getHighestGameCareerLevel } from './game-careers';

type CombinedInfo = {
  InfoResultPayload?: {
    UserData?: Record<string, { Value?: string } | string>;
    PlayerStatistics?: Array<{ StatisticName?: string; Value?: number }>;
  };
};

/** Read a player's saved game progression without inventing a level when none is recorded. */
export async function getPublicPlayerLevel(playFabId: string, secretKey: string): Promise<number | undefined> {
  const response = await fetch(`${PLAYFAB_API_BASE}/Server/GetPlayerCombinedInfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SecretKey': secretKey },
    body: JSON.stringify({
      PlayFabId: playFabId,
      InfoRequestParameters: { GetPlayerStatistics: true, GetUserData: true },
    }),
  });
  const result = await response.json() as { code?: number; data?: CombinedInfo };
  if (!response.ok || result.code !== 200) throw new Error('Could not load player progression.');

  const payload = result.data?.InfoResultPayload;
  const userData = payload?.UserData ?? {};
  const values = Object.fromEntries(Object.entries(userData).map(([key, entry]) => [
    key,
    typeof entry === 'string' ? entry : entry?.Value ?? '',
  ]));
  const stats = Object.fromEntries((payload?.PlayerStatistics ?? []).map((stat) => [
    String(stat.StatisticName ?? '').toLowerCase(), Number(stat.Value ?? 0),
  ]));

  let progression: Record<string, unknown> = {};
  try {
    progression = JSON.parse(values[PLAYFAB_DATA_KEYS.progression] ?? '') as Record<string, unknown>;
  } catch {
    // A malformed or absent save does not establish a level.
  }

  let careerLevel: number | undefined;
  try {
    careerLevel = getHighestGameCareerLevel(values);
  } catch {
    // Ignore invalid career saves and continue with other recorded progression.
  }

  const progressionLevel = Number(progression.level ?? 1);
  const highestLevel = Number(progression.highestLevelUnlocked ?? progression.highest_level ?? 1);
  const totalXp = Number(progression.totalXp ?? progression.total_xp ?? 0);
  const statLevel = Number(stats.level ?? 1);
  const statHighest = Number(stats.highest_level ?? 1);
  const statXp = Number(stats.total_xp ?? 0);
  const recorded = (careerLevel ?? 1) > 1 || progressionLevel > 1 || highestLevel > 1 || totalXp > 0 ||
    statLevel > 1 || statHighest > 1 || statXp > 0 ||
    (Array.isArray(progression.completedLevels) && progression.completedLevels.length > 0);

  return recorded ? Math.max(1, progressionLevel, statLevel, careerLevel ?? 1) : undefined;
}
