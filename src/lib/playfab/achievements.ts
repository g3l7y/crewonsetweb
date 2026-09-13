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
 * Authoritative progress and unlock state come from PlayFab User Data.
 * Returns standard achievements with 0 progress and locked state if no player data exists yet.
 */
export async function getAchievements(sessionTicket: string): Promise<Achievement[]> {
  try {
    const data = await getUserData(sessionTicket, [PLAYFAB_DATA_KEYS.achievements]);
    const raw = data[PLAYFAB_DATA_KEYS.achievements];
    const playerProgressMap: Record<string, { progress?: number; unlocked?: boolean; unlockedAt?: string | null }> = {};

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id) {
              playerProgressMap[item.id] = {
                progress: item.progress ?? (item.unlocked ? 1 : 0),
                unlocked: item.unlocked ?? item.isCompleted ?? false,
                unlockedAt: item.unlockedAt ?? null,
              };
            }
          }
        }
      } catch {
        console.warn('[Achievements] Could not parse achievements JSON from PlayFab.');
      }
    }

    return STANDARD_ACHIEVEMENT_DEFINITIONS.map((def) => {
      const p = playerProgressMap[def.id];
      const progress = p?.progress ?? 0;
      const isCompleted = p?.unlocked ?? (progress >= def.maxProgress);
      const unlockedAt = p?.unlockedAt ?? (isCompleted ? new Date().toISOString() : null);

      return {
        ...def,
        progress,
        unlocked: isCompleted,
        isCompleted,
        unlockedAt,
      };
    });
  } catch (error) {
    console.error('Failed to parse achievements:', error);
    return STANDARD_ACHIEVEMENT_DEFINITIONS.map((def) => ({
      ...def,
      progress: 0,
      unlocked: false,
      isCompleted: false,
      unlockedAt: null,
    }));
  }
}

/**
 * Mapper for achievements data.
 */
export function mapDataToAchievements(data: any): Achievement[] {
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => ({
    id: item.id,
    name: item.name || item.title || 'Unknown',
    title: item.title || item.name || 'Unknown',
    description: item.description || '',
    unlockedAt: item.unlockedAt ? new Date(item.unlockedAt).toISOString() : null,
    progress: item.progress || 0,
    maxProgress: item.maxProgress || 1,
    unlocked: Boolean(item.unlocked || item.isCompleted || (item.progress >= (item.maxProgress || 1))),
    isCompleted: Boolean(item.unlocked || item.isCompleted || (item.progress >= (item.maxProgress || 1))),
  })) as Achievement[];
}
