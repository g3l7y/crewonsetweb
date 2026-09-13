import { playfabClientApi, playfabServerApi, PlayFabError } from './client';
import { PLAYFAB_TITLE_ID } from './config';
import type { PlayerProfile } from './types';

/**
 * Login a user with email and password.
 */
export async function loginWithEmail(email: string, password: string) {
  try {
    const data = await playfabClientApi<{
      SessionTicket: string;
      PlayFabId: string;
      InfoResultPayload: any;
    }>('/Client/LoginWithEmailAddress', {
      Email: email,
      Password: password,
      TitleId: PLAYFAB_TITLE_ID,
      InfoRequestParameters: {
        GetPlayerProfile: true,
        GetUserAccountInfo: true,
      },
    });

    return data;
  } catch (error) {
    if (error instanceof PlayFabError) {
      throw error;
    }
    throw new Error('An unexpected error occurred during login.');
  }
}

/**
 * Register a new user with email, password, and display name.
 */
export async function registerUser(email: string, password: string, displayName: string) {
  try {
    const data = await playfabClientApi<{
      SessionTicket: string;
      PlayFabId: string;
    }>('/Client/RegisterPlayFabUser', {
      Email: email,
      Password: password,
      DisplayName: displayName,
      Username: displayName.toUpperCase(),
      TitleId: PLAYFAB_TITLE_ID,
      RequireBothUsernameAndEmail: true,
    });
    return data;
  } catch (error) {
    if (error instanceof PlayFabError) {
      throw error;
    }
    throw new Error('An unexpected error occurred during registration.');
  }
}

/**
 * Get account info for the current user.
 */
export async function getAccountInfo(sessionTicket: string) {
  try {
    const data = await playfabClientApi<{
      AccountInfo: any;
    }>('/Client/GetAccountInfo', {}, sessionTicket);
    return data.AccountInfo;
  } catch (error) {
    return null;
  }
}

/**
 * @server SERVER-ONLY. Never call from client/browser code.
 * Get tags for a specific player (e.g., to check for admin status).
 */
export async function getPlayerTags(playFabId: string, secretKey: string) {
  try {
    const data = await playfabServerApi<{
      Tags: string[];
    }>('/Server/GetPlayerTags', {
      PlayFabId: playFabId,
    }, secretKey);
    return data.Tags || [];
  } catch (error) {
    return [];
  }
}
