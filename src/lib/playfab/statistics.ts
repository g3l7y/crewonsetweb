import { getRoleStatistics } from './progression';
import type { RoleStatistics } from './types';

/**
 * Get general statistics (mainly roles) for a user.
 * Alias to progression's role statistics for specific modules that import this.
 */
export async function getStatistics(sessionTicket: string): Promise<RoleStatistics[]> {
  return getRoleStatistics(sessionTicket);
}
