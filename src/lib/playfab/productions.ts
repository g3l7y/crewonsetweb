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
      stats: item.stats || [
        ['Retakes', String(item.retakes || 0)],
        ['Errors', String(item.errors || 0)],
      ],
      details: item.details || {},
    } as ProductionLog;
  });
}
