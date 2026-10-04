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
    const detailKeys = Array.from({ length: 5 }, (_, index) => `production_log_level_${index + 1}`);
    const data = await getUserData(sessionTicket, [PLAYFAB_DATA_KEYS.production_logs, ...detailKeys]);
    const raw = data[PLAYFAB_DATA_KEYS.production_logs];
    let summaryLogs: ProductionLog[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        summaryLogs = mapDataToProductionLogs(parsed);
      } catch {
        console.warn('[Productions] Failed to parse production_logs JSON from PlayFab.');
      }
    }
    const detailedLogs = detailKeys.flatMap((key) => {
      const detail = data[key];
      if (!detail) return [];
      try { return mapDataToProductionLogs(JSON.parse(detail)); }
      catch { console.warn(`[Productions] Failed to parse ${key} JSON from PlayFab.`); return []; }
    });
    const merged = new Map<string, ProductionLog>();
    for (const log of summaryLogs) merged.set(log.productionId || log.id || `${log.level}`, log);
    for (const log of detailedLogs) merged.set(log.productionId || log.id || `${log.level}`, log);
    return Array.from(merged.values()).sort((a, b) => new Date(b.date || b.completedAt || 0).getTime() - new Date(a.date || a.completedAt || 0).getTime());
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
  else if (data && !Array.isArray(data) && (data.productionId || data.id)) data = [data];
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => {
    const id = item.productionId || item.id || `PRD-${Date.now()}`;
    const level = Number(item.level) || 1;
    const date = item.date || item.completedAt ? new Date(item.date || item.completedAt).toISOString() : new Date().toISOString();
    const score = Number(item.overallScore ?? item.score ?? 0);
    const letterGrade = item.letterGrade || item.rank || (score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 70 ? 'B' : 'C');

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
      hasPhaseScores: item.hasPhaseScores == null ? undefined : Boolean(item.hasPhaseScores),
      preProductionScore: item.hasPhaseScores === false ? undefined : optionalNumber(item.preProductionScore ?? item.preProdScore ?? item.phaseScores?.preProduction),
      productionScore: item.hasPhaseScores === false ? undefined : optionalNumber(item.productionScore ?? item.phaseScores?.production),
      postProductionScore: item.hasPhaseScores === false ? undefined : optionalNumber(item.postProductionScore ?? item.postProdScore ?? item.phaseScores?.postProduction),
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
      feedback: item.feedback || 'Production completed.',
      success: item.success !== undefined ? Boolean(item.success) : true,
      status: item.status === 'accepted' || item.status === 'completed' || item.status === 'failed' ? item.status : undefined,
      stats: item.stats || [
        ['Retakes', String(item.retakes || 0)],
        ['Errors', String(item.errors || 0)],
      ],
      details: {
        ...(item.details && typeof item.details === 'object' ? item.details : {}),
        ...(item.nextStep ? { nextStep: item.nextStep } : {}),
        ...(item.clientDecision ? { clientDecision: item.clientDecision } : {}),
        ...((item.preProductionFeedback || item.productionFeedback || item.postProductionFeedback) ? {
          phases: {
            ...((item.details?.phases && typeof item.details.phases === 'object') ? item.details.phases : {}),
            ...(item.preProductionFeedback ? { preProduction: { feedback: item.preProductionFeedback } } : {}),
            ...(item.productionFeedback ? { production: { feedback: item.productionFeedback } } : {}),
            ...(item.postProductionFeedback ? { postProduction: { feedback: item.postProductionFeedback } } : {}),
          },
        } : {}),
        ...((item.budgetFeedback || item.budget) ? {
          budgetReview: {
            ...(item.budget && typeof item.budget === 'object' ? item.budget : {}),
            ...(item.budgetFeedback ? { feedback: item.budgetFeedback } : {}),
          },
        } : {}),
      },
      budgetUsed: item.hasBudgetReview === false ? undefined : optionalNumber(item.budgetUsed ?? item.budget?.spent),
      budgetRemaining: item.hasBudgetReview === false ? undefined : optionalNumber(item.budgetRemaining ?? item.budget?.remaining),
      hasBudgetReview: item.hasBudgetReview == null ? undefined : Boolean(item.hasBudgetReview),
      budgetOpeningBalance: item.hasBudgetReview === false ? undefined : optionalNumber(item.budgetOpeningBalance ?? item.budget?.openingBalance),
      budgetIncome: item.hasBudgetReview === false ? undefined : optionalNumber(item.budgetIncome ?? item.budget?.income),
    } as ProductionLog;
  });
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
