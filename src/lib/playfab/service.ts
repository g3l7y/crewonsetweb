import { isMockMode } from './config';
import type { PlayFabService, SessionData, PlayerProfile, Loadout, BugReport, PlayerReport, PartnershipApplication, InventoryItem } from './types';
import { createMockService } from './mock-provider';
import { PlayFabError, playfabClientApi } from './client';
import { PLAYFAB_DATA_KEYS } from './constants';
import { getPlayerProfile, updateDisplayName, getUserData, updateUserData } from './player';
import { getPlayerProgression } from './progression';
import { getCcoinCurrencyCode, getVirtualCurrency } from './economy';
import { getInventory } from './inventory';
import { getAchievements } from './achievements';
import { getKnowledge } from './almanac';
import { getProductionLogs } from './productions';
import { getTransactions } from './transactions';
import { getNotifications } from './notifications';
import { getGlobalLeaderboard, getLeaderboardAroundPlayer } from './leaderboard';
import { getFriendsList } from './friends';
import { DEFAULT_PROFILE_PICTURE_URL, isManagedProfileAvatarUrl } from '../profile-avatar';

// Cached session ticket in memory for fast authenticated Client API calls
let _cachedTicket: string | null = null;
const COOKIE_SESSION_SENTINEL = '__cookie_session__';

type SessionIdentity = {
  playFabId?: string;
  username?: string;
  displayName?: string;
  email?: string;
};

type CosmeticCatalogCategory = 'Hair' | 'Tops' | 'Bottoms' | 'Shoe Wear' | 'Accessories';

function parseCatalogCustomData(value: unknown): Record<string, string> {
  const parsed = typeof value === 'string'
    ? (() => {
        try { return JSON.parse(value); } catch { return {}; }
      })()
    : value;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed).filter(([, entry]) => entry !== null && entry !== undefined).map(([key, entry]) => [key, String(entry)]),
  );
}

function normalizeCosmeticCategory(value: unknown): CosmeticCatalogCategory | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized.includes('shoe') || normalized.includes('footwear') || normalized.includes('boot') || normalized.includes('sneaker')) return 'Shoe Wear';
  if (normalized.includes('accessor') || normalized.includes('eyeglass') || normalized.includes('glass') || normalized.includes('frame')) return 'Accessories';
  if (normalized.includes('hair')) return 'Hair';
  if (normalized === 'top' || normalized === 'tops' || normalized.includes('shirt')) return 'Tops';
  if (normalized === 'bottom' || normalized === 'bottoms' || normalized.includes('pant') || normalized.includes('trouser')) return 'Bottoms';
  return null;
}

function mapPlayFabCatalogItem(item: Record<string, unknown>): InventoryItem | null {
  const itemId = String(item?.ItemId ?? '').trim();
  if (!itemId) return null;

  const customData = parseCatalogCustomData(item.CustomData);
  const virtualCurrencyPrices = item.VirtualCurrencyPrices && typeof item.VirtualCurrencyPrices === 'object' && !Array.isArray(item.VirtualCurrencyPrices)
    ? item.VirtualCurrencyPrices as Record<string, unknown>
    : {};
  const tags = Array.isArray(item.Tags) ? item.Tags : [];
  const category = [customData.category, customData.Category, item.ItemClass, tags.join(' ')]
    .map(normalizeCosmeticCategory)
    .find((value): value is CosmeticCatalogCategory => value !== null) ?? null;
  if (!category) return null;

  const rarityValue = String(item.ItemRarity ?? customData.rarity ?? '').trim().toLowerCase();
  const rarity = ['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(rarityValue) ? rarityValue : 'common';
  const price = virtualCurrencyPrices[getCcoinCurrencyCode()] ?? virtualCurrencyPrices.cCoins ?? item.Price;

  return {
    itemId,
    displayName: typeof item.DisplayName === 'string' ? item.DisplayName : '',
    category: category as unknown as InventoryItem['category'],
    rarity: rarity as InventoryItem['rarity'],
    price: Number.isFinite(Number(price)) ? Number(price) : undefined,
    currency: 'cCoins',
    acquiredAt: '',
    quantity: 1,
    description: typeof item.Description === 'string' ? item.Description : '',
    customData,
  };
}

async function getSessionIdentity(): Promise<SessionIdentity | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.session ?? null;
  } catch {
    return null;
  }
}

export function setCachedSessionTicket(ticket: string | null) {
  _cachedTicket = ticket;
}

export function getCachedSessionTicket(): string | null {
  return _cachedTicket;
}

/**
 * Resolve the active PlayFab session ticket.
 * Checks memory cache first, then calls /api/auth/session.
 */
async function resolveSessionTicket(): Promise<string> {
  if (_cachedTicket) return _cachedTicket;

  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.session) {
        _cachedTicket = COOKIE_SESSION_SENTINEL;
        return _cachedTicket;
      }
    }
  } catch (err) {
    console.warn('[PlayFab] Could not resolve session ticket from /api/auth/session:', err);
  }

  return '';
}

function createRealService(): PlayFabService {
  return {
    auth: {
      login: async (request) => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        const data = await res.json();
        return data;
      },
      register: async (request) => {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        const data = await res.json();
        return data;
      },
      logout: async () => {
        _cachedTicket = null;
        await fetch('/api/auth/logout', { method: 'POST' });
      },
      getSession: async () => {
        try {
          const res = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data.session ?? null;
        } catch {
          return null;
        }
      },
      isAdmin: async () => {
        try {
          const res = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
          });
          if (!res.ok) return false;
          const data = await res.json();
          return data?.session?.role === 'admin';
        } catch {
          return false;
        }
      },
    },

    player: {
      getProfile: async () => {
        const ticket = await resolveSessionTicket();
        const sessionIdentity = await getSessionIdentity();
        const fallbackProfile = {
          id: sessionIdentity?.playFabId ?? '',
          playFabId: sessionIdentity?.playFabId ?? '',
          email: sessionIdentity?.email ?? '',
          displayName: sessionIdentity?.displayName || sessionIdentity?.username || 'Player',
          username: sessionIdentity?.username || sessionIdentity?.displayName || 'player',
          avatarUrl: DEFAULT_PROFILE_PICTURE_URL,
          role: 'cameraman' as const,
          crewId: 'CREW-001',
          bio: '',
          joinedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        if (!ticket) {
          return fallbackProfile;
        }
        const profile = await getPlayerProfile(ticket);
        if (profile) {
          const metadataRaw = (await getUserData(ticket, [PLAYFAB_DATA_KEYS.profile_metadata]))[PLAYFAB_DATA_KEYS.profile_metadata];
          if (metadataRaw) {
            try {
              const metadata = JSON.parse(metadataRaw) as Pick<PlayerProfile, 'username' | 'bio' | 'avatarUrl' | 'socialLinks' | 'showStatus' | 'profileVisibility' | 'showCrewActivity'>;
              return {
                ...profile,
                ...metadata,
                avatarUrl: isManagedProfileAvatarUrl(metadata.avatarUrl) ? metadata.avatarUrl : DEFAULT_PROFILE_PICTURE_URL,
              };
            } catch {
              // Ignore malformed optional profile metadata and keep the PlayFab profile.
            }
          }
          if ((profile.username === 'player' || profile.displayName === 'Player') && sessionIdentity?.username) {
            return {
              ...profile,
              username: sessionIdentity.username,
              displayName: sessionIdentity.displayName || sessionIdentity.username,
              email: profile.email || sessionIdentity.email || '',
            };
          }
        }
        return profile ?? fallbackProfile;
      },

      getProgression: async () => {
        const ticket = await resolveSessionTicket();
        if (!ticket) {
          return {
            level: 1,
            currentXp: 0,
            xpToNextLevel: 10000,
            totalXp: 0,
            highestLevelUnlocked: 1,
            completedLevels: [],
            completedStages: {},
            tutorialProgress: 0,
            tutorialsCompleted: false,
            campaignCompleted: false,
            multiplayerUnlocked: false,
            highest_level: 1,
            total_xp: 0,
            tutorial_progress: 0,
            campaign_completed: 0,
            multiplayer_unlocked: 0,
          };
        }
        return getPlayerProgression(ticket);
      },

      getWallet: async () => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return { bCoins: 0, cCoins: 0 };
        return getVirtualCurrency(ticket);
      },

      getInventory: async () => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return [];
        return getInventory(ticket);
      },

      getLoadout: async () => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return {};
        try {
          const data = await getUserData(ticket, [PLAYFAB_DATA_KEYS.loadout]);
          const rawLoadout = data[PLAYFAB_DATA_KEYS.loadout];
          if (rawLoadout) {
            return JSON.parse(rawLoadout);
          }
        } catch { /* Ignore malformed saved loadout and use an empty loadout. */ }
        return {};
      },

      getAchievements: async () => {
        const ticket = await resolveSessionTicket();
        return getAchievements(ticket);
      },

      getKnowledge: async () => {
        const ticket = await resolveSessionTicket();
        return getKnowledge(ticket);
      },

      getProductionLogs: async () => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return [];
        return getProductionLogs(ticket);
      },

      getTransactions: async () => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return [];
        return getTransactions(ticket);
      },

      getFriends: async () => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return [];
        return getFriendsList(ticket);
      },

      getNotifications: async () => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return [];
        return getNotifications(ticket);
      },

      updateProfile: async (updates) => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return;
        const profileUpdates = updates as Partial<PlayerProfile>;
        if (updates.username) {
          if (!(await updateDisplayName(ticket, updates.username))) throw new Error('PlayFab could not update your username.');
        } else if (updates.displayName) {
          if (!(await updateDisplayName(ticket, updates.displayName))) throw new Error('PlayFab could not update your display name.');
        }
        if ('bio' in profileUpdates || 'avatarUrl' in profileUpdates || 'socialLinks' in profileUpdates || 'showStatus' in profileUpdates || 'profileVisibility' in profileUpdates || 'showCrewActivity' in profileUpdates) {
          const currentRaw = (await getUserData(ticket, [PLAYFAB_DATA_KEYS.profile_metadata]))[PLAYFAB_DATA_KEYS.profile_metadata];
          let current: Partial<Pick<PlayerProfile, 'username' | 'bio' | 'avatarUrl' | 'socialLinks' | 'showStatus' | 'profileVisibility' | 'showCrewActivity'>> = {};
          if (currentRaw) {
            try { current = JSON.parse(currentRaw); } catch { /* replace malformed metadata */ }
          }
          const saved = await updateUserData(ticket, {
            [PLAYFAB_DATA_KEYS.profile_metadata]: JSON.stringify({
              ...current,
              ...(profileUpdates.username !== undefined ? { username: profileUpdates.username } : {}),
              ...(profileUpdates.bio !== undefined ? { bio: profileUpdates.bio } : {}),
              ...(profileUpdates.avatarUrl !== undefined ? { avatarUrl: profileUpdates.avatarUrl } : {}),
              ...(profileUpdates.socialLinks !== undefined ? { socialLinks: profileUpdates.socialLinks } : {}),
              ...(profileUpdates.showStatus !== undefined ? { showStatus: profileUpdates.showStatus } : {}),
              ...(profileUpdates.profileVisibility !== undefined ? { profileVisibility: profileUpdates.profileVisibility } : {}),
              ...(profileUpdates.showCrewActivity !== undefined ? { showCrewActivity: profileUpdates.showCrewActivity } : {}),
            }),
          });
          if (!saved) throw new Error('PlayFab could not save your profile metadata.');
        }
      },

      updateLoadout: async (loadout) => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return;
        await updateUserData(ticket, {
          [PLAYFAB_DATA_KEYS.loadout]: JSON.stringify(loadout),
        });
      },
    },

    leaderboard: {
      getGlobal: async (statistic, maxResults) => {
        const ticket = await resolveSessionTicket();
        return getGlobalLeaderboard(statistic, 0, maxResults ?? 50, ticket);
      },
      getAroundPlayer: async (statistic, maxResults) => {
        const ticket = await resolveSessionTicket();
        return getLeaderboardAroundPlayer(statistic, maxResults ?? 10, ticket);
      },
    },

    shop: {
      getCatalog: async (): Promise<InventoryItem[]> => {
        const ticket = await resolveSessionTicket();
        if (!ticket) return [];
        try {
          const data = await playfabClientApi<{ Catalog?: unknown[] }>('/Client/GetCatalogItems', {}, ticket);
          return (data.Catalog ?? [])
            .map((item) => mapPlayFabCatalogItem(item as Record<string, unknown>))
            .filter((item): item is InventoryItem => item !== null);
        } catch {
          return [];
        }
      },

      purchaseItem: async (itemId, priceOrCurrency: any, currencyOrPrice?: any) => {
        const ticket = await resolveSessionTicket();
        if (!ticket) {
          throw new PlayFabError(401, 'Please log in to purchase items.');
        }

        const currency = typeof priceOrCurrency === 'string' ? priceOrCurrency : (currencyOrPrice as string);
        const price = typeof priceOrCurrency === 'number' ? priceOrCurrency : Number(currencyOrPrice);
        const pfCurrency = currency === 'cCoins' ? getCcoinCurrencyCode() : 'BC';

        try {
          await playfabClientApi('/Client/PurchaseItem', {
            ItemId: itemId,
            Price: price,
            VirtualCurrency: pfCurrency,
          }, ticket);
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error?.message || 'Failed to purchase item.' };
        }
      },

      purchaseCoinPack: async (_packId) => {
        // Enforce strict security boundary: real-money C-Coins require payment gateway verification
        throw new PlayFabError(
          501,
          'Real-money C-Coin purchases require payment provider integration (e.g. Stripe, GCash / PayMongo). Live transactions are disabled until payment processor credentials are configured.',
        );
      },
    },

    admin: {
      getPlayers: async () => {
        try {
          const res = await fetch('/api/admin/players');
          if (!res.ok) return [];
          const json = await res.json();
          return json.data ?? [];
        } catch {
          return [];
        }
      },
      getPlayer: async (id) => {
        try {
          const res = await fetch(`/api/admin/players?id=${encodeURIComponent(id)}`);
          if (!res.ok) return null;
          const json = await res.json();
          return json.data ?? null;
        } catch {
          return null;
        }
      },
      getBugReports: async () => {
        const res = await fetch('/api/admin/bug-reports');
        if (!res.ok) throw new Error('Failed to fetch bug reports');
        const json = await res.json();
        return json.data ?? [];
      },
      getPlayerReports: async () => {
        const res = await fetch('/api/admin/player-reports');
        if (!res.ok) throw new Error('Failed to fetch player reports');
        const json = await res.json();
        return json.data ?? [];
      },
      getPartnerships: async () => {
        const res = await fetch('/api/admin/partnerships');
        if (!res.ok) throw new Error('Failed to fetch partnerships');
        const json = await res.json();
        return json.data ?? [];
      },
      getAds: async () => {
        const res = await fetch('/api/admin/ad-revenue');
        if (!res.ok) throw new Error('Failed to fetch advertisement revenue');
        const json = await res.json();
        return json.data ?? [];
      },
      getRevenue: async () => [],
      getGameBuilds: async () => [],
      getBuildHistory: async () => [],
      getSystemRequirements: async () => [],
      getInstallSteps: async () => [],
      getSocialLinks: async () => [],
      getNotifications: async () => [],
      submitBugReport: async (report) => {
        const res = await fetch('/api/admin/bug-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        });
        if (!res.ok) throw new Error('Failed to submit bug report');
        const json = await res.json();
        return json.data;
      },
      submitPlayerReport: async (report) => {
        const res = await fetch('/api/admin/player-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        });
        if (!res.ok) throw new Error('Failed to submit player report');
        const json = await res.json();
        return json.data;
      },
      submitPartnership: async (app) => {
        const res = await fetch('/api/admin/partnerships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app),
        });
        if (!res.ok) throw new Error('Failed to submit partnership application');
        const json = await res.json();
        return json.data;
      },
      updateBugReport: async (id, status) => {
        const res = await fetch('/api/admin/bug-reports', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(typeof status === 'object' ? { id, ...status } : { id, status }),
        });
        if (!res.ok) throw new Error('Failed to update bug report');
      },
      deleteBugReport: async (id) => {
        const res = await fetch('/api/admin/bug-reports', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        });
        if (!res.ok) throw new Error('Failed to delete bug report');
      },
      deleteBugReports: async (ids) => {
        const res = await fetch('/api/admin/bug-reports', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error('Failed to delete bug reports');
      },
      updatePlayerReport: async (id, status) => {
        const res = await fetch('/api/admin/player-reports', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(typeof status === 'object' ? { id, ...status } : { id, status }),
        });
        if (!res.ok) throw new Error('Failed to update player report');
      },
      deletePlayerReport: async (id) => {
        const res = await fetch('/api/admin/player-reports', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        });
        if (!res.ok) throw new Error('Failed to delete player report');
      },
      deletePlayerReports: async (ids) => {
        const res = await fetch('/api/admin/player-reports', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error('Failed to delete player reports');
      },
      updatePartnership: async (id, status) => {
        const res = await fetch('/api/admin/partnerships', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(typeof status === 'object' ? { id, ...status } : { id, status }),
        });
        if (!res.ok) throw new Error('Failed to update partnership application');
      },
      deletePartnership: async (id) => {
        const res = await fetch('/api/admin/partnerships', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        });
        if (!res.ok) throw new Error('Failed to delete partnership application');
      },
      deletePartnerships: async (ids) => {
        const res = await fetch('/api/admin/partnerships', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error('Failed to delete partnership applications');
      },
      updateAd: async () => {},
      deleteAd: async () => {},
      updateGameBuild: async () => {},
      updateSystemRequirements: async () => {},
      updateInstallSteps: async () => {},
      updateSocialLinks: async () => {},
    },
  };
}

let _service: PlayFabService | null = null;

export function getPlayFabService(): PlayFabService {
  if (!_service) {
    _service = isMockMode() ? createMockService() : createRealService();
  }
  return _service;
}

/** Shorthand alias */
export const playfab = new Proxy({} as PlayFabService, {
  get(_, prop) {
    return (getPlayFabService() as any)[prop];
  },
});

export { PlayFabError };
