import { getUserData } from './player';
import type { Transaction } from './types';

/**
 * Get transaction history for the user.
 */
export async function getTransactions(sessionTicket: string): Promise<Transaction[]> {
  try {
    const data = await getUserData(sessionTicket, ['transactions']);
    if (data['transactions']) {
      const parsed = JSON.parse(data['transactions']);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          id: item.id,
          date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
          description: item.description || '',
          amount: item.amount || 0,
          currency: item.currency || 'BC',
        })) as Transaction[];
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to parse transactions:', error);
    return [];
  }
}
