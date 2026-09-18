import { getUserData } from './player';
import type { CurrencyType, Transaction, TransactionType } from './types';

/**
 * Get transaction history for the user.
 */
export async function getTransactions(sessionTicket: string): Promise<Transaction[]> {
  try {
    const data = await getUserData(sessionTicket, ['transactions']);
    if (data['transactions']) {
      const parsed = JSON.parse(data['transactions']);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, index: number) => {
          const amount = Number(item.amount) || 0;
          const type = (item.type || (amount < 0 ? 'spend' : 'earn')) as TransactionType;
          const currency = item.currency === 'CC' || item.currency === 'cCoins' ? 'cCoins' : 'bCoins';
          const timestamp = item.timestamp || item.date || new Date().toISOString();

          return {
            id: String(item.id || ('tx-' + index + '-' + timestamp)),
            type,
            date: new Date(timestamp).toISOString(),
            timestamp: new Date(timestamp).toISOString(),
            description: item.description || item.label || 'Player transaction',
            amount: Math.abs(amount),
            currency: currency as CurrencyType,
            itemId: item.itemId,
          } satisfies Transaction;
        });
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to parse transactions:', error);
    return [];
  }
}
