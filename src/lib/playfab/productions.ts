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
    const data = await getUserData(sessionTicket, [PLAYFAB_DATA_KEYS.production_logs]);
    const raw = data[PLAYFAB_DATA_KEYS.production_logs];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return mapDataToProductionLogs(parsed);
      } catch {
        console.warn('[Productions] Failed to parse production_logs JSON from PlayFab.');
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to get production logs:', error);
    return [];
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
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => {
    const id = item.productionId || item.id || `PRD-${Date.now()}`;
    const level = Number(item.level) || 1;
    const date = item.date || item.completedAt ? new Date(item.date || item.completedAt).toISOString() : new Date().toISOString();
    const score = Number(item.overallScore ?? item.score ?? 0);
    const letterGrade = item.letterGrade || item.rank || (score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 70 ? 'B' : 'C');
    const sourceDetails = item.details && typeof item.details === 'object' ? item.details : {};
    const sourcePhases = item.phases ?? sourceDetails.phases ?? {};
    const readPhase = (camel: string, snake: string, feedbackKey: string, scoreKey: string) => {
      const phase = sourcePhases[camel] ?? sourcePhases[snake] ?? {};
      const feedback = phase && typeof phase === 'object' ? phase.feedback ?? phase.clientFeedback ?? phase.notes ?? phase.review : phase;
      const phaseScore = phase && typeof phase === 'object' ? phase.score : undefined;
      return {
        ...(feedback != null && feedback !== '' ? { feedback } : item[feedbackKey] ?? item[snake + '_feedback'] ?? item[camel + 'Review'] ?? item[snake + '_review'] ? { feedback: item[feedbackKey] ?? item[snake + '_feedback'] ?? item[camel + 'Review'] ?? item[snake + '_review'] } : {}),
        ...(phaseScore != null ? { score: phaseScore } : item[scoreKey] != null ? { score: item[scoreKey] } : {}),
      };
    };
    const phaseDetails = {
      preProduction: readPhase('preProduction', 'pre_production', 'preProductionFeedback', 'pre_production_score'),
      production: readPhase('production', 'production', 'productionFeedback', 'production_score'),
      postProduction: readPhase('postProduction', 'post_production', 'postProductionFeedback', 'post_production_score'),
    };
    const rawBudget = item.budget && typeof item.budget === 'object' ? item.budget : sourceDetails.budgetReview ?? {};
    const budgetReview = {
      ...rawBudget,
      openingBalance: rawBudget.openingBalance ?? rawBudget.openingCash ?? rawBudget.opening_cash,
      income: rawBudget.income,
      spent: rawBudget.spent ?? rawBudget.amountSpent ?? rawBudget.amount_spent,
      remaining: rawBudget.remaining ?? rawBudget.remainingCash ?? rawBudget.remaining_cash,
    };
    const decision = item.clientDecision ?? item.client_decision ?? item.decision ?? sourceDetails.clientDecision;
    const nextStep = item.nextStep ?? item.your_next_step ?? item.next_step ?? sourceDetails.nextStep;
    const details = {
      ...sourceDetails,
      phases: Object.fromEntries(Object.entries(phaseDetails).filter(([, phase]) => phase.feedback != null || phase.score != null)),
      ...(Object.keys(rawBudget).length ? { budgetReview } : {}),
      ...(decision != null ? { clientDecision: decision } : {}),
      ...(nextStep != null ? { nextStep } : {}),
    };

    return {
      productionId: id,
      id,
      contractId: item.contractId,
      clientName: item.clientName || item.client || 'Commercial Client',
      clientBrandName: item.clientBrandName || item.brandName || item.client_name || item.clientName || item.client || 'Commercial Client',
      client: item.clientName || item.client || 'Commercial Client',
      level,
      stage: item.stage || item.title || `Level ${level} Shoot`,
      title: item.title || item.stage || `Level ${level} Shoot`,
      mode: (item.mode || 'solo') as ProductionMode,
      teamId: item.teamId,
      date,
      completedAt: date,
      playerId: item.playerId || '',
      role: (item.role || item.rolePlayed || 'cameraman') as PlayerRole,
      rolePlayed: (item.role || item.rolePlayed || 'cameraman') as string,
      overallScore: score,
      preProductionScore: optionalNumber(item.preProductionScore ?? item.preProdScore ?? item.phaseScores?.preProduction),
      productionScore: optionalNumber(item.productionScore ?? item.phaseScores?.production),
      postProductionScore: optionalNumber(item.postProductionScore ?? item.postProdScore ?? item.phaseScores?.postProduction),
      score,
      letterGrade,
      rank: letterGrade,
      runtime: item.runtime || '00:00',
      retakes: Number(item.retakes) || 0,
      errors: Number(item.errors) || 0,
      budgetUsed: item.budgetUsed != null ? Number(item.budgetUsed) : undefined,
      budgetRemaining: item.budgetRemaining != null ? Number(item.budgetRemaining) : undefined,
      bCoinsEarned: Number(item.bCoinsEarned) || 0,
      cCoinsEarned: item.cCoinsEarned != null ? Number(item.cCoinsEarned) : 0,
      feedback: item.decisionFeedback || item.decision_feedback || item.result || item.summary || item.feedback || 'Production completed.',
      success: item.success !== undefined ? Boolean(item.success) : typeof decision === 'string' ? decision.toLowerCase() === 'passed' : true,
      status: item.status === 'accepted' || item.status === 'completed' ? item.status : undefined,
      stats: item.stats || [
        ['Retakes', String(item.retakes || 0)],
        ['Errors', String(item.errors || 0)],
      ],
      details,
      budgetUsed: optionalNumber(item.budgetUsed ?? item.budget?.spent),
      budgetRemaining: optionalNumber(item.budgetRemaining ?? item.budget?.remaining),
    } as ProductionLog;
  });
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
