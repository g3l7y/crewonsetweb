import { getUserData } from './player';
import { PLAYFAB_DATA_KEYS } from './constants';
import { careerInt, isRecord, mapGameCareerSaves, mapCareerAttemptsToProductionLogs } from './game-careers';
import type { ProductionHistory, ProductionLog, ProductionMode, PlayerRole } from './types';

export async function getProductionHistory(sessionTicket: string): Promise<ProductionHistory> {
  const data = await getUserData(sessionTicket, undefined, true);
  return {
    logs: mapUserDataToProductionLogs(data).sort((a, b) => b.date.localeCompare(a.date)),
    careers: mapGameCareerSaves(data).map((career) => {
      const active = career.active?.['closed'] === false ? career.active : undefined;
      return {
        id: career.id, name: career.name, level: career.currentLevel,
        balance: careerInt(career, 'PlayerMoney'), updatedUtc: career.updatedUtc,
        completedAttempts: career.results.filter((attempt) => attempt['closed'] === true).length,
        activeLevel: typeof active?.['level'] === 'number' ? active['level'] : undefined,
        takes: typeof active?.['takes'] === 'number' ? active['takes'] : undefined,
        transactions: (Array.isArray(active?.['transactions']) ? active['transactions'] : []).filter(isRecord)
          .filter((t) => typeof t['amount'] === 'number' && Number.isFinite(t['amount']))
          .map((t) => ({ item: String(t['item'] ?? ''), category: String(t['category'] ?? ''), amount: t['amount'] as number })),
      };
    }),
  };
}

/**
 * Fetch all production logs for a user.
 * Reads dedicated logs and the game's existing career checkpoints.
 * Missing history is empty; failed requests and unreadable saves are errors.
 */
export async function getProductionLogs(sessionTicket: string): Promise<ProductionLog[]> {
  try {
    const data = await getUserData(sessionTicket, undefined, true);
    const logs = mapUserDataToProductionLogs(data);
    return logs.sort((a, b) =>
      new Date(b.date || b.completedAt || 0).getTime() - new Date(a.date || a.completedAt || 0).getTime(),
    );
  } catch (error) {
    console.error('Failed to get production logs:', error);
    throw error;
  }
}

/** The game writes both dedicated logs and results inside its private career saves. */
export function mapUserDataToProductionLogs(data: Record<string, string>): ProductionLog[] {
  const raw = data[PLAYFAB_DATA_KEYS.production_logs];
  const logs = mapDataToProductionLogs(mapCareerAttemptsToProductionLogs(data));
  const dedicated = raw ? mapDataToProductionLogs(JSON.parse(raw)) : [];
  const merged = new Map<string, ProductionLog>();
  for (const log of [...logs, ...dedicated]) {
    const key = log.submissionId || log.id || log.productionId || `record-${merged.size}`;
    const previous = merged.get(key);
    const supplied = Object.fromEntries(Object.entries(log).filter(([, value]) => value !== undefined && value !== ''));
    merged.set(key, previous ? { ...previous, ...supplied, details: { ...previous.details, ...log.details } } : log);
  }
  return [...merged.values()];
}

/**
 * Fetch a specific production log by ID.
 */
export async function getProduction(sessionTicket: string, productionId: string): Promise<ProductionLog | null> {
  const logs = await getProductionLogs(sessionTicket);
  return logs.find(log => (log.productionId === productionId || log.id === productionId)) || null;
}

/**
 * Fetch the most recent production logs.
 */
export async function getRecentProductions(sessionTicket: string, count: number): Promise<ProductionLog[]> {
  const logs = await getProductionLogs(sessionTicket);
  return logs
    .sort((a, b) => new Date(b.date || b.completedAt || 0).getTime() - new Date(a.date || a.completedAt || 0).getTime())
    .slice(0, count);
}

/**
 * Comprehensive mapper for production logs.
 * Guarantees all UI and domain fields are safely mapped.
 */
export function mapDataToProductionLogs(data: any): ProductionLog[] {
  if (data && !Array.isArray(data) && Array.isArray(data.logs)) data = data.logs;
  else if (data && !Array.isArray(data) && Array.isArray(data.records)) data = data.records;
  else if (data && !Array.isArray(data) && Array.isArray(data.production_logs)) data = data.production_logs;
  else if (data && !Array.isArray(data) && (data.productionId || data.id)) data = [data];
  if (!Array.isArray(data)) throw new Error('PlayFab production history has an unreadable format.');
  return data.filter((item: unknown) => item !== null && typeof item === 'object' && !Array.isArray(item)).map((item: any, index: number) => {
    const id = item.id || item.submissionId || item.submission_id || item.productionId || item.production_id || `record-${index}`;
    const level = optionalNumber(item.level) ?? 0;
    const rawDate = item.played_at || item.playedUtc || item.completedAt || item.date;
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const date = parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.toISOString() : '';
    const rawScore = item.overallScore ?? item.overall_score ?? item.score;
    const score = optionalNumber(rawScore);
    const letterGrade = item.letterGrade || item.letter_grade || item.rank || '—';
    const sourcePhases = item.phases ?? item.details?.phases ?? {};
    const phaseValue = (camel: string, snake: string, feedbackField: string, scoreField: string) => {
      const phase = sourcePhases[camel] ?? sourcePhases[snake] ?? {};
      const feedback = phase && typeof phase === 'object' ? phase.feedback ?? phase.clientFeedback ?? phase.notes ?? phase.review : phase;
      const phaseScore = phase && typeof phase === 'object' ? phase.score : undefined;
      return {
        ...(feedback != null ? { feedback } : (item[feedbackField] ?? item[snake + '_feedback'] ?? item[camel + 'Review'] ?? item[snake + '_review']) != null ? { feedback: item[feedbackField] ?? item[snake + '_feedback'] ?? item[camel + 'Review'] ?? item[snake + '_review'] } : {}),
        ...(phaseScore != null ? { score: phaseScore } : item[scoreField] != null ? { score: item[scoreField] } : {}),
      };
    };
    const phaseDetails = {
      preProduction: phaseValue('preProduction', 'pre_production', 'preProductionFeedback', 'pre_production_score'),
      production: phaseValue('production', 'production', 'productionFeedback', 'production_score'),
      postProduction: phaseValue('postProduction', 'post_production', 'postProductionFeedback', 'post_production_score'),
    };
    const explicitBudget = item.budget && typeof item.budget === 'object' ? item.budget : item.details?.budgetReview ?? {};
    const budgetReview = {
      ...explicitBudget,
      openingBalance: explicitBudget.openingBalance ?? explicitBudget.openingCash ?? explicitBudget.opening_cash,
      income: explicitBudget.income,
      spent: explicitBudget.spent ?? explicitBudget.amountSpent ?? explicitBudget.amount_spent,
      remaining: explicitBudget.remaining ?? explicitBudget.remainingCash ?? explicitBudget.remaining_cash,
    };
    const decision = item.clientDecision || item.client_decision || item.decision || item.details?.clientDecision;
    const nextStep = item.nextStep || item.your_next_step || item.next_step || item.details?.nextStep;
    const hasPhaseData = Object.values(phaseDetails).some((phase) => phase.feedback != null || phase.score != null);
    const hasBudgetReview = explicitBudget.available === true || explicitBudget.available === false || Object.keys(explicitBudget).length > 0;
    const passed = item.passed ?? item.success ?? (typeof decision === 'string' ? decision.toLowerCase() === 'passed' : undefined);
    const client = item.clientName || item.clientBrandName || item.client_brand || item.client || undefined;
    const production = item.title || item.product_name || item.contract_name || item.production || item.stage || '';
    const details = {
      ...(item.details && typeof item.details === 'object' ? item.details : {}),
      ...(item.submissionId || item.submission_id ? { submissionId: item.submissionId || item.submission_id } : {}),
      ...(item.careerId || item.career_id ? { careerId: item.careerId || item.career_id } : {}),
      ...(hasPhaseData ? { phases: Object.fromEntries(Object.entries(phaseDetails).filter(([, phase]) => phase.feedback != null || phase.score != null)) } : {}),
      ...(hasBudgetReview ? { budgetReview: { ...budgetReview, ...(budgetReview.feedback ? { feedback: budgetReview.feedback } : {}) } } : {}),
      ...(decision ? { clientDecision: decision } : {}),
      ...(nextStep ? { nextStep } : {}),
      ...(typeof (item.summary || item.result) === 'string' ? { shootSummary: item.summary || item.result } : {}),
      ...(typeof item.setupNotes === 'string' ? { setupNotes: item.setupNotes } : {}),
    };

    return {
      productionId: item.productionId || item.production_id || id,
      id,
      submissionId: item.submissionId || item.submission_id,
      contractId: item.contractId || item.contract_id,
      clientName: client,
      clientBrandName: client,
      client,
      level,
      stage: production,
      title: production,
      mode: (item.mode === 'singleplayer' ? 'solo' : item.mode || 'solo') as ProductionMode,
      teamId: item.teamId,
      date,
      completedAt: date,
      playerId: item.playerId || item.player_id || item.playfab_id || '',
      role: (item.role || item.roles?.join?.(', ') || item.rolePlayed || '') as PlayerRole,
      rolePlayed: (item.role || item.roles?.join?.(', ') || item.rolePlayed || '') as string,
      overallScore: score,
      hasPhaseScores: item.hasPhaseScores == null ? hasPhaseData || undefined : Boolean(item.hasPhaseScores),
      preProductionScore: item.hasPhaseScores === false ? undefined : optionalNumber(item.preProductionScore ?? item.preProdScore ?? phaseDetails.preProduction.score),
      productionScore: item.hasPhaseScores === false ? undefined : optionalNumber(item.productionScore ?? phaseDetails.production.score),
      postProductionScore: item.hasPhaseScores === false ? undefined : optionalNumber(item.postProductionScore ?? item.postProdScore ?? phaseDetails.postProduction.score),
      score,
      letterGrade,
      rank: letterGrade,
      runtime: item.runtime,
      ...(item.retakes != null ? { retakes: Number(item.retakes) } : {}),
      ...(item.errors != null ? { errors: Number(item.errors) } : {}),
      ...(item.bCoinsEarned != null ? { bCoinsEarned: Number(item.bCoinsEarned) } : {}),
      ...(item.cCoinsEarned != null ? { cCoinsEarned: Number(item.cCoinsEarned) } : {}),
      feedback: item.feedback || item.result || item.decisionFeedback || item.decision_feedback || '',
      clientDecision: typeof decision === 'string' ? decision : undefined,
      preProductionFeedback: phaseDetails.preProduction.feedback as string | undefined,
      productionFeedback: phaseDetails.production.feedback as string | undefined,
      postProductionFeedback: phaseDetails.postProduction.feedback as string | undefined,
      budgetFeedback: item.budgetFeedback || item.budget_feedback || budgetReview.feedback,
      nextStep: typeof nextStep === 'string' ? nextStep : undefined,
      success: passed == null ? undefined : Boolean(passed),
      ...(item.status === 'accepted' || item.status === 'completed' || item.status === 'failed' ? { status: item.status } : {}),
      ...(Array.isArray(item.stats) ? { stats: item.stats } : {}),
      details,
      budgetUsed: item.hasBudgetReview === false || explicitBudget.available === false ? undefined : optionalNumber(item.budgetUsed ?? budgetReview.spent),
      budgetRemaining: item.hasBudgetReview === false || explicitBudget.available === false ? undefined : optionalNumber(item.budgetRemaining ?? budgetReview.remaining),
      hasBudgetReview: item.hasBudgetReview == null ? (hasBudgetReview ? Boolean(explicitBudget.available ?? explicitBudget.tracking_complete ?? true) : undefined) : Boolean(item.hasBudgetReview),
      budgetOpeningBalance: item.hasBudgetReview === false || explicitBudget.available === false ? undefined : optionalNumber(item.budgetOpeningBalance ?? budgetReview.openingBalance),
      budgetIncome: item.hasBudgetReview === false || explicitBudget.available === false ? undefined : optionalNumber(item.budgetIncome ?? budgetReview.income),
    } as ProductionLog;
  });
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

