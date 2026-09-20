import { playfabClientApi } from './client';
import type { FriendInfo } from './types';

/**
 * Get the player's friends list.
 */
export async function getFriendsList(sessionTicket: string): Promise<FriendInfo[]> {
  try {
    const data = await playfabClientApi<{
      Friends: any[];
    }>('/Client/GetFriendsList', {}, sessionTicket);

    return (data.Friends || []).map((friend: any) => ({
      playFabId: friend.FriendPlayFabId,
      friendPlayFabId: friend.FriendPlayFabId,
      username: friend.TitleInfo?.DisplayName || friend.Profile?.DisplayName || friend.Username || 'Crew Member',
      displayName: friend.TitleInfo?.DisplayName || friend.Profile?.DisplayName || 'Crew Member',
      status: 'confirmed' as const,
      role: 'cameraman' as const,
      level: 1,
      online: Boolean(friend.IsOnline ?? friend.Online ?? false),
      showStatus: typeof friend.ShowStatus === 'boolean' ? friend.ShowStatus : undefined,
      tags: friend.Tags || [],
    })) as FriendInfo[];
  } catch (error) {
    return [];
  }
}

/**
 * Add a friend by PlayFab ID.
 */
export async function addFriend(sessionTicket: string, friendPlayFabId: string): Promise<boolean> {
  try {
    await playfabClientApi('/Client/AddFriend', {
      FriendPlayFabId: friendPlayFabId,
    }, sessionTicket);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Remove a friend by PlayFab ID.
 */
export async function removeFriend(sessionTicket: string, friendPlayFabId: string): Promise<boolean> {
  try {
    await playfabClientApi('/Client/RemoveFriend', {
      FriendPlayFabId: friendPlayFabId,
    }, sessionTicket);
    return true;
  } catch (error) {
    return false;
  }
}
