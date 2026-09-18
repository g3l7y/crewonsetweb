import { getUserData } from './player';
import { PLAYFAB_DATA_KEYS } from './constants';
import type { PlayerNotification } from './types';

/** Read player notifications persisted in PlayFab User Data. */
export async function getNotifications(sessionTicket: string): Promise<PlayerNotification[]> {
  try {
    const data = await getUserData(sessionTicket, [PLAYFAB_DATA_KEYS.notifications]);
    const raw = data[PLAYFAB_DATA_KEYS.notifications];
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.id === 'string')
      .map((item) => ({
        id: item.id,
        title: item.title || 'Crew update',
        body: item.body || item.message || '',
        kind: item.kind || item.type || 'system',
        read: Boolean(item.read),
        createdAt: item.createdAt || new Date().toISOString(),
        href: item.href,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}