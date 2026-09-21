import { getUserData } from './player';
import { PLAYFAB_DATA_KEYS } from './constants';
import type { Achievement } from './types';

export const STANDARD_ACHIEVEMENT_DEFINITIONS: (Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress' | 'isCompleted'> & { maxProgress: number })[] = [
  { id: 'first_wrap', title: 'First Wrap!', name: 'First Wrap!', description: 'Complete your first production.', maxProgress: 1 },
  { id: 'five_star_director', title: 'Five Star Director', name: 'Five Star Director', description: 'Earn a perfect score as Director.', maxProgress: 1 },
  { id: 'lighting_master', title: 'Lighting Master', name: 'Lighting Master', description: 'Complete 10 productions as AV Technician.', maxProgress: 10 },
  { id: 'camera_pro', title: 'Camera Pro', name: 'Camera Pro', description: 'Achieve 95%+ focus accuracy in 5 productions.', maxProgress: 5 },
  { id: 'budget_hawk', title: 'Budget Hawk', name: 'Budget Hawk', description: 'Complete a production under budget 3 times.', maxProgress: 3 },
  { id: 'team_player', title: 'Team Player', name: 'Team Player', description: 'Complete 5 multiplayer productions.', maxProgress: 5 },
  { id: 'knowledge_seeker', title: 'Knowledge Seeker', name: 'Knowledge Seeker', description: 'Unlock 15 knowledge entries.', maxProgress: 15 },
  { id: 'speed_demon', title: 'Speed Demon', name: 'Speed Demon', description: 'Complete a production in under 30 minutes.', maxProgress: 1 },
];

/**
 * Fetch achievements for the player.
 *
 * Real mode deliberately returns only records written by the game to PlayFab.
 * The website must not invent achievement names, descriptions, progress, or
 * unlock dates when the game has not supplied them yet.
 */
export async function getAchievements(sessionTicket: string): Promise<Achievement[]> {
  try {
    const data = await getUserData(sessionTicket, [PLAYFAB_DATA_KEYS.achievements]);
    const raw = data[PLAYFAB_DATA_KEYS.achievements];
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray(parsed.achievements)
        ? parsed.achievements
        : [];

    return mapDataToAchievements(records);
  } catch (error) {
    console.error('Failed to parse achievements:', error);
    return [];
  }
}

/**
 * Mapper for achievements data.
 */
type AchievementRecord = Record<string, unknown>;

export function mapDataToAchievements(data: unknown): Achievement[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item): item is AchievementRecord => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const id = String(item.id ?? item.achievementId ?? '').trim();
      const title = String(item.title ?? item.name ?? '').trim();
      const description = String(item.description ?? '').trim();
      const progress = Number.isFinite(Number(item.progress)) ? Number(item.progress) : 0;
      const maxProgress = Number.isFinite(Number(item.maxProgress)) ? Number(item.maxProgress) : 0;
      const explicitlyUnlocked = item.unlocked ?? item.isCompleted;
      const unlocked = typeof explicitlyUnlocked === 'boolean'
        ? explicitlyUnlocked
        : maxProgress > 0 && progress >= maxProgress;

      return {
        id,
        name: title,
        title,
        description,
        unlockedAt: item.unlockedAt ? new Date(item.unlockedAt).toISOString() : null,
        progress,
        maxProgress,
        unlocked: Boolean(unlocked),
        isCompleted: Boolean(unlocked),
        iconUrl: typeof item.iconUrl === 'string' ? item.iconUrl : undefined,
      };
    })
    .filter((item) => item.id.length > 0) as Achievement[];
}
