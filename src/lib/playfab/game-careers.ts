// Unity sources: GameSaveManager, GameSaveRepository, PlayerAnalytics.
const CAREER_SAVE_PREFIX = 'CrewCareer_v1_';
const ANALYTICS_KEY = 'Analytics.Career.v1';
type JsonRecord = Record<string, unknown>;
export const isRecord = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export interface GameCareerSave {
  id: string;
  name: string;
  currentLevel: number;
  results: JsonRecord[];
  values: Map<string, JsonRecord>;
}
export function careerInt(career: GameCareerSave, key: string): number | undefined {
  const value = career.values.get(key);
  return value?.['kind'] === 0 && typeof value['integer'] === 'number' && Number.isFinite(value['integer'])
    ? value['integer'] : undefined;
}
/** Read existing private Unity cloud checkpoints, including chunked analytics. */
export function mapGameCareerSaves(userData: Record<string, string>): GameCareerSave[] {
  return Object.entries(userData).filter(([key]) => key.startsWith(CAREER_SAVE_PREFIX)).flatMap(([key, raw]) => {
    const save: unknown = JSON.parse(raw);
    if (!isRecord(save) || !Array.isArray(save['values'])) throw new Error('Unreadable game career checkpoint.');
    const values = new Map<string, JsonRecord>();
    for (const entry of save['values']) {
      if (isRecord(entry) && typeof entry['key'] === 'string') values.set(entry['key'], entry);
    }
    // Deleted careers remain in PlayFab as tombstones and must never reappear.
    if (values.get('SaveDeleted')?.['integer'] === 1) return [];
    const career: GameCareerSave = {
      id: typeof save['id'] === 'string' ? save['id'] : key.slice(CAREER_SAVE_PREFIX.length),
      name: typeof save['name'] === 'string' ? save['name'] : '',
      currentLevel: 1, results: [], values,
    };
    career.currentLevel = careerInt(career, 'CurrentLevel') ?? 1;
    const count = careerInt(career, `${ANALYTICS_KEY}.Count`) ?? 0;
    if (count < 0 || count > 1500 || !Number.isInteger(count)) throw new Error('Invalid game history chunk count.');
    const text = (name: string) => {
      const entry = values.get(name);
      return entry?.['kind'] === 2 && typeof entry['text'] === 'string' ? entry['text'] : undefined;
    };
    const chunks = count > 0 ? Array.from({ length: count }, (_, i) => text(`${ANALYTICS_KEY}.${i}`)) : [];
    if (chunks.some((chunk) => chunk === undefined)) throw new Error('Game history is still syncing: a checkpoint chunk is missing.');
    const historyJson = count > 0 ? chunks.join('') : text(ANALYTICS_KEY);
    if (historyJson) {
      const history: unknown = JSON.parse(historyJson);
      if (!isRecord(history)) throw new Error('Unreadable game production history.');
      career.results = Array.isArray(history['results']) ? history['results'].filter(isRecord) : [];
      const active = history['active'];
      if (isRecord(active) && active['closed'] === true && !career.results.some((r) =>
        active['submissionId'] ? r['submissionId'] === active['submissionId'] : JSON.stringify(r) === JSON.stringify(active))) {
        career.results.push(active);
      }
    }
    return [career];
  });
}
export function getHighestGameCareerLevel(userData: Record<string, string>): number | undefined {
  const levels = mapGameCareerSaves(userData).map((career) => career.currentLevel);
  return levels.length ? Math.max(...levels) : undefined;
}
/** Adapt saved attempts; never create scores, feedback or completion dates. */
export function mapCareerAttemptsToProductionLogs(userData: Record<string, string>): JsonRecord[] {
  return mapGameCareerSaves(userData).flatMap((career) => career.results
    .filter((attempt) => attempt['closed'] === true)
    .map((attempt, index) => {
      const detailed = isRecord(attempt['productionLog']) ? attempt['productionLog'] : {};
      const submissionId = attempt['submissionId'];
      const grade = attempt['grade'];
      const decision = detailed['client_decision'] ?? detailed['clientDecision'] ?? detailed['decision'];
      const passed = typeof decision === 'string' ? decision === 'passed'
        : typeof grade === 'string' && ['S', 'A', 'B', 'C', 'F'].includes(grade) ? grade !== 'F' : undefined;
      const camera = attempt['camera'];
      const lighting = attempt['lighting'];
      const transactions = Array.isArray(attempt['transactions']) ? attempt['transactions'].filter(isRecord) : [];
      const amounts = transactions.map((t) => t['amount']).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
      const income = amounts.filter((n) => n >= 0).reduce((a, b) => a + b, 0);
      const spent = -amounts.filter((n) => n < 0).reduce((a, b) => a + b, 0);
      const opening = attempt['opening'];
      const closing = attempt['closing'];
      const budget = attempt['budget'] ?? (typeof opening === 'number' && typeof closing === 'number' && Array.isArray(attempt['transactions']) ? {
        openingCash: opening, remainingCash: closing, income, amountSpent: spent, available: true,
        complete: attempt['partial'] === false && attempt['assisted'] === false && opening + income - spent === closing,
      } : undefined);
      return {
        id: submissionId || `${career.id}:attempt-${index}`,
        submissionId, careerId: career.id, level: attempt['level'], mode: 'singleplayer',
        playedUtc: attempt['playedUtc'] || attempt['date'], score: attempt['score'], rank: grade,
        preProductionScore: attempt['pre'],
        productionScore: typeof camera === 'number' && typeof lighting === 'number' ? camera + lighting : undefined,
        postProductionScore: attempt['post'], passed,
        clientDecision: passed === undefined ? undefined : passed ? 'passed' : 'failed',
        nextStep: attempt['nextStep'], budget,
        ...detailed,
        feedback: detailed['decisionFeedback'] ?? detailed['result'] ?? attempt['completionFeedback'],
        details: { careerName: career.name, careerId: career.id, submissionId, source: 'career',
          cameraScore: camera, lightingScore: lighting, takes: attempt['takes'], transactions,
          partialTracking: attempt['partial'], assisted: attempt['assisted'] },
      };
    }));
}
