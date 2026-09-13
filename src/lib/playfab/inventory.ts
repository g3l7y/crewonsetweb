import { playfabClientApi, playfabServerApi } from './client';
import type { InventoryItem } from './types';

/**
 * Get the user's inventory items.
 */
export async function getInventory(sessionTicket: string): Promise<InventoryItem[]> {
  try {
    const data = await playfabClientApi<{
      Inventory: any[];
    }>('/Client/GetUserInventory', {}, sessionTicket);

    return (data.Inventory || []).map(mapPlayFabItemToInventoryItem);
  } catch (error) {
    return [];
  }
}

/**
 * Convert a PlayFab inventory item to our domain model.
 */
export function mapPlayFabItemToInventoryItem(item: any): InventoryItem {
  return {
    itemInstanceId: item.ItemInstanceId,
    itemId: item.ItemId,
    displayName: item.DisplayName || item.ItemId,
    customData: item.CustomData || {},
    purchaseDate: item.PurchaseDate ? new Date(item.PurchaseDate).toISOString() : new Date().toISOString(),
    remainingUses: item.RemainingUses,
  } as InventoryItem;
}

/**
 * @server SERVER-ONLY. Never call from client/browser code.
 * Grant an item to a user.
 */
export async function grantItem(playFabId: string, itemId: string, secretKey: string): Promise<boolean> {
  try {
    await playfabServerApi('/Server/GrantItemsToUser', {
      PlayFabId: playFabId,
      ItemIds: [itemId],
    }, secretKey);
    return true;
  } catch (error) {
    console.error('Error granting item:', error);
    return false;
  }
}
