import { playfabClientApi } from './client';
import { getUserData } from './player';
import { PLAYFAB_DATA_KEYS, PLAYFAB_STATISTICS } from './constants';
import type { PlayerProgression, RoleStatistics } from './types';

/**
 * Get comprehensive player progression.
 * Priority 1: User Data key 'progression' (JSON object written by Unity/backend).
 * Priority 2: Player Statistics (standard integer metrics).
 * Fallback: Default uninitialized Level 1 progression (never crashes).
 */
export async function getPlayerProgression(sessionTicket: string): Promise<PlayerProgression> {
  const defaultProgression: PlayerProgression = {
    level: 1,
    currentXp: 0,
    xpToNextLevel: 10000,
    totalXp: 0,
    highestLevelUnlocked: 1,
    completedLevels: [],
    completedStages: {},
    tutorialProgress: 0,
    tutorialsCompleted: false,
    campaignCompleted: false,
    multiplayerUnlocked: false,
    // Convenience aliases
    highest_level: 1,
    total_xp: 0,
    tutorial_progress: 0,
    campaign_completed: 0,
    multiplayer_unlocked: 0,
  };

  try {
    // 1. Check UserData 'progression' key
    const userData = await getUserData(sessionTicket, [PLAYFAB_DATA_KEYS.progression]);
    const rawProg = userData[PLAYFAB_DATA_KEYS.progression];
    if (rawProg) {
      try {
        const parsed = JSON.parse(rawProg);
        return {
          ...defaultProgression,
          ...parsed,
          level: parsed.level ?? defaultProgression.level,
          currentXp: parsed.currentXp ?? parsed.xp ?? defaultProgression.currentXp,
          xpToNextLevel: parsed.xpToNextLevel ?? defaultProgression.xpToNextLevel,
          totalXp: parsed.totalXp ?? parsed.total_xp ?? defaultProgression.totalXp,
          highestLevelUnlocked: parsed.highestLevelUnlocked ?? parsed.highest_level ?? defaultProgression.highestLevelUnlocked,
          completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : defaultProgression.completedLevels,
          completedStages: parsed.completedStages ?? defaultProgression.completedStages,
          tutorialProgress: parsed.tutorialProgress ?? parsed.tutorial_progress ?? defaultProgression.tutorialProgress,
          tutorialsCompleted: Boolean(parsed.tutorialsCompleted),
          campaignCompleted: Boolean(parsed.campaignCompleted ?? parsed.campaign_completed),
          multiplayerUnlocked: Boolean(parsed.multiplayerUnlocked ?? parsed.multiplayer_unlocked),
        };
      } catch {
        console.warn('[Progression] Failed to parse progression JSON from PlayFab.');
      }
    }

    // 2. Check Player Statistics
    const statsData = await playfabClientApi<{
      Statistics: Array<{ StatisticName: string; Value: number }>;
    }>('/Client/GetPlayerStatistics', {}, sessionTicket);

    const stats = statsData.Statistics || [];
    if (stats.length === 0) {
      return defaultProgression;
    }

    const statMap: Record<string, number> = {};
    for (const s of stats) {
      statMap[s.StatisticName] = s.Value;
    }

    const level = statMap[PLAYFAB_STATISTICS.level] ?? defaultProgression.level;
    const totalXp = statMap[PLAYFAB_STATISTICS.total_xp] ?? defaultProgression.totalXp;
    const currentXp = totalXp % defaultProgression.xpToNextLevel;
    const highestLevel = statMap[PLAYFAB_STATISTICS.highest_level] ?? level;
    const tutorialProgress = statMap[PLAYFAB_STATISTICS.tutorial_progress] ?? defaultProgression.tutorialProgress;
    const campaignCompleted = (statMap[PLAYFAB_STATISTICS.campaign_completed] ?? 0) > 0;
    const multiplayerUnlocked = (statMap[PLAYFAB_STATISTICS.multiplayer_unlocked] ?? 0) > 0;

    return {
      ...defaultProgression,
      level,
      currentXp,
      totalXp,
      highestLevelUnlocked: highestLevel,
      tutorialProgress,
      tutorialsCompleted: tutorialProgress >= 100,
      campaignCompleted,
      multiplayerUnlocked,
      highest_level: highestLevel,
      total_xp: totalXp,
      tutorial_progress: tutorialProgress,
      campaign_completed: campaignCompleted ? 1 : 0,
      multiplayer_unlocked: multiplayerUnlocked ? 1 : 0,
    };
  } catch (error) {
    console.error('Failed to get player progression:', error);
    return defaultProgression;
  }
}

/**
 * Backward compatibility alias
 */
export const getPlayerStatistics = getPlayerProgression;

/**
 * Convert raw PlayFab statistics array to PlayerProgression.
 */
export function mapStatisticsToProgression(stats: Array<{ StatisticName: string; Value: number }>): PlayerProgression {
  const progression: any = {
    level: 1,
    currentXp: 0,
    xpToNextLevel: 10000,
    totalXp: 0,
    highestLevelUnlocked: 1,
    completedLevels: [],
    completedStages: {},
    tutorialProgress: 0,
    tutorialsCompleted: false,
    campaignCompleted: false,
    multiplayerUnlocked: false,
    highest_level: 1,
    total_xp: 0,
    tutorial_progress: 0,
    campaign_completed: 0,
    multiplayer_unlocked: 0,
  };

  for (const stat of stats) {
    if (stat.StatisticName in progression) {
      progression[stat.StatisticName] = stat.Value;
    }
  }

  progression.highestLevelUnlocked = progression.highest_level ?? progression.level;
  progression.totalXp = progression.total_xp ?? 0;
  progression.tutorialProgress = progression.tutorial_progress ?? 0;
  progression.campaignCompleted = Boolean(progression.campaign_completed);
  progression.multiplayerUnlocked = Boolean(progression.multiplayer_unlocked);

  return progression as PlayerProgression;
}

/**
 * Get role-specific statistics.
 */
export async function getRoleStatistics(sessionTicket: string): Promise<RoleStatistics[]> {
  try {
    const data = await playfabClientApi<{
      Statistics: Array<{ StatisticName: string; Value: number }>;
    }>('/Client/GetPlayerStatistics', {}, sessionTicket);

    const roles: Record<string, RoleStatistics> = {
      director: { role: 'director', productions: 0, averageScore: 0, perfectScores: 0, knowledgeUnlocked: 0 },
      cameraman: { role: 'cameraman', productions: 0, averageScore: 0, perfectScores: 0, knowledgeUnlocked: 0 },
      av_technician: { role: 'av_technician', productions: 0, averageScore: 0, perfectScores: 0, knowledgeUnlocked: 0 },
      editor: { role: 'editor', productions: 0, averageScore: 0, perfectScores: 0, knowledgeUnlocked: 0 },
    };

    for (const stat of data.Statistics || []) {
      const name = stat.StatisticName;
      if (name.startsWith('director_')) {
        if (name.includes('productions') && roles['director']) roles['director'].productions = stat.Value;
        if (name.includes('avg_score') && roles['director']) roles['director'].averageScore = stat.Value;
      } else if (name.startsWith('cameraman_')) {
        if (name.includes('productions') && roles['cameraman']) roles['cameraman'].productions = stat.Value;
        if (name.includes('avg_score') && roles['cameraman']) roles['cameraman'].averageScore = stat.Value;
      } else if (name.startsWith('av_tech_')) {
        if (name.includes('productions') && roles['av_technician']) roles['av_technician'].productions = stat.Value;
        if (name.includes('avg_score') && roles['av_technician']) roles['av_technician'].averageScore = stat.Value;
      } else if (name.startsWith('editor_')) {
        if (name.includes('productions') && roles['editor']) roles['editor'].productions = stat.Value;
        if (name.includes('avg_score') && roles['editor']) roles['editor'].averageScore = stat.Value;
      }
    }

    return Object.values(roles);
  } catch (error) {
    return [];
  }
}
