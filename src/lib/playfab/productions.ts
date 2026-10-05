import { getUserData } from './player';
import { PLAYFAB_DATA_KEYS } from './constants';
import type { ProductionLog, ProductionMode, PlayerRole } from './types';

/**
 * Fetch all production logs for a user.
 * Authoritative history stored under User Data key 'production_logs'.
 * Handles missing data gracefully by returning empty array.
 */
export async function getProductionLogs(sessionTicket: string): Promise<ProductionLog[]> {
  try {
    const data = await getUserData(sessionTicket, [PLAYFAB_DATA_KEYS.production_logs], true);
    const raw = data[PLAYFAB_DATA_KEYS.production_logs];
    if (!raw) return [];
    const logs = mapDataToProductionLogs(JSON.parse(raw));
    return logs.sort((a, b) =>
      new Date(b.date || b.completedAt || 0).getTime() - new Date(a.date || a.completedAt || 0).getTime(),
    );
  } catch (error) {
    console.error('Failed to get production logs:', error);
    throw error;
  }
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
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => {
    const id = item.id || item.submissionId || item.submission_id || item.productionId || item.production_id || `level-${Number(item.level) || 1}`;
    const level = Number(item.level) || 1;
    const rawDate = item.date || item.completedAt || item.played_at || item.playedUtc;
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const date = parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.toISOString() : '';
    const rawScore = item.overallScore ?? item.overall_score ?? item.score;
    const score = optionalNumber(rawScore);
    const letterGrade = item.letterGrade || item.letter_grade || item.rank || '—';
    const sourcePhases = item.phases ?? item.details?.phases ?? {};
    const phaseValue = (camel: string, snake: string, feedbackField: string, scoreField: string) => {
      const phase = sourcePhases[camel] ?? sourcePhases[snake] ?? {};
      const feedback = phase && typeof phase === 'object' ? phase.feedback ?? phase.clientFeedback ?? phase.notes : phase;
      const phaseScore = phase && typeof phase === 'object' ? phase.score : undefined;
      return {
        ...(feedback != null ? { feedback } : item[feedbackField] != null ? { feedback: item[feedbackField] } : {}),
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
      phases: Object.fromEntries(Object.entries(phaseDetails).filter(([, phase]) => phase.feedback != null || phase.score != null)),
      ...(hasBudgetReview ? { budgetReview: { ...budgetReview, ...(budgetReview.feedback ? { feedback: budgetReview.feedback } : {}) } } : {}),
      ...(decision ? { clientDecision: decision } : {}),
      ...(nextStep ? { nextStep } : {}),
      ...(typeof (item.summary || item.result) === 'string' ? { shootSummary: item.summary || item.result } : {}),
      ...(typeof item.setupNotes === 'string' ? { setupNotes: item.setupNotes } : {}),
    };

    return {
      productionId: item.productionId || item.production_id || id,
      id,
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

