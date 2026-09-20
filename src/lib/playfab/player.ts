import { playfabClientApi, PlayFabError } from './client';
import type { PlayerProfile } from './types';

/**
 * Get the current player's profile.
 */
export async function getPlayerProfile(sessionTicket: string): Promise<PlayerProfile | null> {
  try {
    const data = await playfabClientApi<{
      PlayerProfile: any;
    }>('/Client/GetPlayerProfile', {
      ProfileConstraints: {
        ShowDisplayName: true,
        ShowAvatarUrl: true,
        ShowLastLogin: true,
      }
    }, sessionTicket);

    return mapPlayFabProfileToPlayerProfile(data.PlayerProfile);
  } catch (error) {
    console.error('Error fetching player profile', error);
    return null;
  }
}

/**
 * Update the player's display name.
 */
export async function updateDisplayName(sessionTicket: string, displayName: string): Promise<boolean> {
  try {
    await playfabClientApi('/Client/UpdateUserTitleDisplayName', {
      DisplayName: displayName,
    }, sessionTicket);
    return true;
  } catch (error) {
    console.error('Error updating display name', error);
    return false;
  }
}

/**
 * Get specific arbitrary data keys for the player.
 */
export async function getUserData(sessionTicket: string, keys: string[]): Promise<Record<string, string>> {
  try {
    const data = await playfabClientApi<{
      Data: Record<string, { Value: string; LastUpdated: string }>;
    }>('/Client/GetUserData', {
      Keys: keys,
    }, sessionTicket);

    const result: Record<string, string> = {};
    if (data.Data) {
      for (const [key, item] of Object.entries(data.Data)) {
        result[key] = item.Value;
      }
    }
    return result;
  } catch (error) {
    return {};
  }
}

/**
 * Update arbitrary player data.
 */
export async function updateUserData(sessionTicket: string, data: Record<string, string>): Promise<boolean> {
  try {
    await playfabClientApi('/Client/UpdateUserData', {
      Data: data,
    }, sessionTicket);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert PlayFab profile to our domain PlayerProfile.
 */
export function mapPlayFabProfileToPlayerProfile(profile: any): PlayerProfile {
  if (!profile) {
    return {
      id: '',
      playFabId: '',
      displayName: 'Player',
      username: 'player',
      email: '',
      avatarUrl: '/assets/crew-team-illustration.png',
      role: 'cameraman',
      crewId: 'CREW-001',
      bio: '',
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
  }

  const playFabId = profile.PlayerId || '';
  const displayName = profile.DisplayName || 'Player';
  const lastLoginAt = profile.LastLogin ? new Date(profile.LastLogin).toISOString() : new Date().toISOString();
  const joinedAt = profile.Created ? new Date(profile.Created).toISOString() : new Date().toISOString();

  return {
    id: playFabId,
    playFabId,
    displayName,
    username: displayName,
    email: profile.Email || '',
    avatarUrl: profile.AvatarUrl || '/assets/crew-team-illustration.png',
    role: (profile.Role || 'cameraman') as any,
    crewId: profile.CrewId || 'CREW-001',
    bio: profile.Bio || '',
    joinedAt,
    createdAt: joinedAt,
    lastLoginAt,
    lastLogin: lastLoginAt,
  };
}
