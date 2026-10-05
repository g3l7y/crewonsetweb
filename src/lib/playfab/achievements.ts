import { getUserData } from './player';
import { PLAYFAB_DATA_KEYS } from './constants';
import { careerInt, isRecord, mapGameCareerSaves } from './game-careers';
import type { Achievement } from './types';

/** Reads Unity's existing private data. No website-created awards or unlock dates. */
export async function getAchievements(sessionTicket: string): Promise<Achievement[]> {
  return mapUserDataToAchievements(await getUserData(sessionTicket, undefined, true));
}

export function mapDataToAchievements(data: unknown): Achievement[] {
  const records = isRecord(data) ? data['achievements'] : data;
  if (!Array.isArray(records)) throw new Error('Unreadable game achievements.');
  return records.filter(isRecord).flatMap((item) => {
    const id = String(item['id'] ?? item['achievementId'] ?? '').trim();
    if (!id) return [];
    const title = String(item['title'] ?? item['name'] ?? id).trim();
    const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
    const progress = number(item['progress'] ?? item['currentProgress']);
    const maxProgress = number(item['maxProgress']);
    const explicit = item['unlocked'] ?? item['isUnlocked'] ?? item['isCompleted'];
    const unlocked = typeof explicit === 'boolean' ? explicit : maxProgress > 0 && progress >= maxProgress;
    const rawDate = item['unlockedAt'];
    const date = typeof rawDate === 'string' ? new Date(rawDate) : null;
    return [{ id, title, name: title, description: String(item['description'] ?? ''), progress, maxProgress,
      unlocked, isCompleted: unlocked,
      unlockedAt: date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
      ...(typeof item['iconUrl'] === 'string' ? { iconUrl: item['iconUrl'] } : {}),
    }];
  });
}

type Definition = { id: string; title: string; description: string; goal: number; field?: string; level?: number; completed?: boolean };
// Exact IDs, text and goals from Assets/Script/CareerProfileProgress.cs in crew-on-set.
// The game stores progress as Profile.Career.v1 / AchivProg_* / AchivDone_* inside CrewCareer_v1_*.
export const GAME_CAREER_ACHIEVEMENTS: Definition[] = [
  { id: 'first_take', title: 'First take', description: 'Save your first camera recording to an SD card.', goal: 1, field: 'recordings' },
  { id: 'ten_takes', title: 'Behind the lens', description: 'Save 10 camera recordings in this career.', goal: 10, field: 'recordings' },
  { id: 'twenty_five_takes', title: 'Rolling!', description: 'Save 25 camera recordings in this career.', goal: 25, field: 'recordings' },
  { id: 'first_client', title: 'Signed, sealed, delivered', description: 'Pass your first commercial contract, including its mandatory requirements.', goal: 1, completed: true },
  ...[['blooms', 'Crystal Blooms'], ['goke', 'Goke Cola'], ['terrari', 'Terrari'], ['coffee', 'Kape Kultura'], ['haraya', 'Haraya']].map(([id, name], index) => ({
    id: id!, title: `${name} approved`, description: `Pass the ${name} contract and all its mandatory requirements.`, goal: 1, level: index + 1,
  })),
  { id: 'campaign', title: 'Full portfolio', description: 'Pass all five different commercial contracts in this career.', goal: 5, completed: true },
  { id: 'top_rank', title: "Director's cut", description: 'Earn an S grade on a passed contract.', goal: 1, field: 'topRank' },
  { id: 'polished', title: 'Finishing touch', description: 'Pass a contract with a post-production score of at least 95/100.', goal: 1, field: 'polished' },
  { id: 'balanced', title: 'All-round filmmaker', description: 'Pass with at least 90/100 in each of the three production departments.', goal: 1, field: 'balanced' },
  { id: 'comeback', title: 'Second act', description: 'Pass a contract after a tracked failed attempt at the same contract.', goal: 1, field: 'comeback' },
  { id: 'first_try', title: 'Right first time', description: 'Pass on the first fully tracked attempt at a contract, without developer funds.', goal: 1, field: 'firstTry' },
  { id: 'frugal', title: 'Budget keeper', description: 'Pass a fully tracked contract without developer funds or rejected purchases, retaining at least 1,000 B-Coins.', goal: 1, field: 'frugal' },
];
const gradedKeys = ['FlowerContractGraded', 'GokeContractGraded', 'LamborminiContractGraded', 'KapeKulturaContractGraded', 'HarayaContractGraded'];

export function mapUserDataToAchievements(data: Record<string, string>): Achievement[] {
  const raw = data[PLAYFAB_DATA_KEYS.achievements];
  const direct = raw ? mapDataToAchievements(JSON.parse(raw)) : [];
  const careers = mapGameCareerSaves(data).flatMap((career) => {
    const saved = career.values.get('Profile.Career.v1')?.['text'];
    const parsed: unknown = typeof saved === 'string' && saved ? JSON.parse(saved) : undefined;
    const profile = isRecord(parsed) && parsed['version'] === 1 ? parsed : undefined;
    let mask = typeof profile?.['completedMask'] === 'number' ? profile['completedMask'] : 0;
    gradedKeys.forEach((key, i) => { if (careerInt(career, key) === 1) mask |= 1 << i; });
    const completed = gradedKeys.filter((_, i) => (mask & (1 << i)) !== 0).length;
    return GAME_CAREER_ACHIEVEMENTS.flatMap((definition): Achievement[] => {
      const gameId = `career_${definition.id}`;
      const savedProgress = careerInt(career, `AchivProg_${gameId}`);
      const savedDone = careerInt(career, `AchivDone_${gameId}`);
      if (!profile && savedProgress === undefined && savedDone === undefined && !mask) return [];
      const fieldValue = definition.field ? profile?.[definition.field] : undefined;
      const derived = definition.completed ? completed : definition.level ? Number((mask & (1 << (definition.level - 1))) !== 0)
        : typeof fieldValue === 'boolean' ? Number(fieldValue) : typeof fieldValue === 'number' ? fieldValue : 0;
      const progress = Math.max(0, Math.min(definition.goal, profile ? derived : savedProgress ?? derived));
      const unlocked = savedDone === 1 || progress === definition.goal;
      return [{ id: `${career.id}:${gameId}`, title: definition.title, name: definition.title,
        description: definition.description, careerName: career.name,
        maxProgress: definition.goal, progress: unlocked ? definition.goal : progress,
        unlocked, isCompleted: unlocked, unlockedAt: null }];
    });
  });
  return [...direct, ...careers];
}
