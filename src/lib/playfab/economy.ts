import { playfabClientApi, playfabServerApi } from './client';
import type { PlayerWallet } from './types';

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
      cCoins: currencies['CC'] || 0, // Server authoritative only, but readable by client
    } as PlayerWallet;
  } catch (error) {
    return { bCoins: 0, cCoins: 0 } as PlayerWallet;
  }
}

/**
 * @server SERVER-ONLY. Never call from client/browser code.
 * Add virtual currency to a user.
 */
export async function addCurrency(playFabId: string, currency: string, amount: number, secretKey: string): Promise<boolean> {
  try {
    await playfabServerApi('/Server/AddUserVirtualCurrency', {
      PlayFabId: playFabId,
      VirtualCurrency: currency,
      Amount: amount,
    }, secretKey);
    return true;
  } catch (error) {
    console.error('Error adding currency:', error);
    return false;
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
