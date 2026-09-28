import { playfabClientApi, playfabServerApi } from './client';
import type { PlayerWallet } from './types';

/** The PlayFab virtual-currency code used for premium C-Coins. */
export function getCcoinCurrencyCode(): string {
  const configured = typeof process !== 'undefined'
    ? process.env['PLAYFAB_CCOIN_CURRENCY_CODE']?.trim().toUpperCase()
    : undefined;
  const publicConfigured = typeof import.meta !== 'undefined'
    ? String(import.meta.env?.VITE_PLAYFAB_CCOIN_CURRENCY_CODE ?? '').trim().toUpperCase()
    : '';
  return configured || publicConfigured || 'CC';
}

/**
 * Get the player's virtual currencies (bCoins and cCoins).
 */
export async function getVirtualCurrency(sessionTicket: string): Promise<PlayerWallet> {
  try {
    const data = await playfabClientApi<{
      VirtualCurrency: Record<string, number>;
    }>('/Client/GetUserInventory', {}, sessionTicket);

    const currencies = data.VirtualCurrency || {};
    return {
      bCoins: currencies['BC'] || 0,
      cCoins: currencies[getCcoinCurrencyCode()] || 0, // Server authoritative only, but readable by client
    } as PlayerWallet;
  } catch (error) {
    return { bCoins: 0, cCoins: 0 } as PlayerWallet;
  }
}

/**
 * @server SERVER-ONLY. Never call from client/browser code.
 * Add virtual currency to a user.
 */
export type CurrencyGrantResult =
  | { success: true; balance: number; balanceChange: number; currency: string }
  | { success: false; error: string };

export async function addCurrency(
  playFabId: string,
  currency: string,
  amount: number,
  secretKey: string,
  customTags?: Record<string, string>,
): Promise<CurrencyGrantResult> {
  try {
    const result = await playfabServerApi<{
      Balance?: number;
      BalanceChange?: number;
      PlayFabId?: string;
      VirtualCurrency?: string;
    }>('/Server/AddUserVirtualCurrency', {
      PlayFabId: playFabId,
      VirtualCurrency: currency,
      Amount: amount,
      ...(customTags ? { CustomTags: customTags } : {}),
    }, secretKey);
    const balanceChange = result.BalanceChange === undefined ? amount : Number(result.BalanceChange);
    if (result.PlayFabId && result.PlayFabId !== playFabId) {
      return { success: false, error: 'PlayFab credited a different player.' };
    }
    if (result.VirtualCurrency && result.VirtualCurrency !== currency) {
      return { success: false, error: 'PlayFab credited a different virtual currency.' };
    }
    if (!Number.isFinite(balanceChange) || balanceChange !== amount) {
      return { success: false, error: 'PlayFab reported an unexpected C-Coin balance change.' };
    }
    return {
      success: true,
      balance: Number(result.Balance ?? 0),
      balanceChange,
      currency,
    };
  } catch (error) {
    console.error('Error adding currency:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PlayFab rejected the currency grant.',
    };
  }
}

/**
 * @server SERVER-ONLY. Never call from client/browser code.
 * Subtract virtual currency from a user.
 */
export async function subtractCurrency(playFabId: string, currency: string, amount: number, secretKey: string): Promise<boolean> {
  try {
    await playfabServerApi('/Server/SubtractUserVirtualCurrency', {
      PlayFabId: playFabId,
      VirtualCurrency: currency,
      Amount: amount,
    }, secretKey);
    return true;
  } catch (error) {
    console.error('Error subtracting currency:', error);
    return false;
  }
}
