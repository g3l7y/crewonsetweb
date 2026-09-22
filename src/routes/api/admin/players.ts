import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import { PLAYFAB_API_BASE } from '@/lib/playfab/config';
import { PLAYFAB_DATA_KEYS } from '@/lib/playfab/constants';
import { getCcoinCurrencyCode } from '@/lib/playfab/economy';
import { mapDataToAchievements } from '@/lib/playfab/achievements';
import { mapDataToProductionLogs } from '@/lib/playfab/productions';
import {
  WEBSITE_DATA_KEYS,
  getWebsiteRecords,
} from '@/lib/playfab/websiteData';
import type {
  AdminPlayerActivity,
  AdminPlayerDetails,
  AdminPlayerTransaction,
  PlayerProfile,
  PlayerProgression,
  RoleStatistics,
} from '@/lib/playfab/types';

type PlayFabResponse<T> = {
  code?: number;
  errorMessage?: string;
  data?: T;
};

type Segment = { Id?: string; Name?: string };
type SegmentExport = { State?: string; IndexUrl?: string };
type ExportRecord = Record<string, unknown>;
type UserDataValue = { Value?: string; LastUpdated?: string } | string;
type UserDataMap = Record<string, UserDataValue>;
type BanRecord = { Active?: boolean; Expires?: string; Reason?: string };

type PayMongoOrder = {
  id: string;
  checkoutSessionId?: string;
  playFabId: string;
  username?: string;
  packageId: string;
  coins: number;
  amountInCentavos: number;
  currency: 'PHP';
  email?: string;
  status: 'pending' | 'active' | 'processing' | 'fulfilled' | 'failed';
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  eventId?: string;
};

type CachedPlayers = { expiresAt: number; players: PlayerProfile[] };

const PLAYER_CACHE_TTL_MS = 60_000;
let playerCache: CachedPlayers | null = null;
let playerRequest: Promise<PlayerProfile[]> | null = null;
const pendingDeletedPlayerIds = new Set<string>();

function getSecretKey(): string | null {
  return process.env['PLAYFAB_SECRET_KEY']?.trim() || null;
}

async function playFabServerRequest<T>(path: string, body: Record<string, unknown>, secretKey: string): Promise<T> {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SecretKey': secretKey },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as PlayFabResponse<T>;
  if (!response.ok || result.code !== 200 || result.data === undefined) {
    throw new Error(result.errorMessage || `PlayFab request failed: ${path}`);
  }
  return result.data;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function flattenRecord(value: unknown, prefix = '', output: ExportRecord = {}): ExportRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) output[prefix] = value;
    return output;
  }
  for (const [key, entry] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) flattenRecord(entry, nextKey, output);
    else output[nextKey] = entry;
  }
  return output;
}

function parseDelimitedLine(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
      continue;
    }
    if (character === '\t' && !quoted) {
      values.push(value);
      value = '';
      continue;
    }
    value += character;
  }
  values.push(value);
  return values;
}

function parseTsv(text: string): ExportRecord[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseDelimitedLine(lines[0] ?? '');
  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line);
    return headers.reduce<ExportRecord>((record, header, index) => {
      record[header] = values[index] ?? '';
      return record;
    }, {});
  });
}

function recordsFromJson(value: unknown): ExportRecord[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is ExportRecord => Boolean(entry && typeof entry === 'object' && !Array.isArray(entry)));
  }
  if (!value || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  for (const key of ['Players', 'Profiles', 'Records', 'Data', 'data']) {
    if (Array.isArray(object[key])) return recordsFromJson(object[key]);
  }
  return [object];
}

function parseExportFragment(text: string): ExportRecord[] {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return recordsFromJson(JSON.parse(trimmed)); } catch { /* fall through to TSV */ }
  }
  return parseTsv(text);
}

function getExportValue(record: ExportRecord, candidates: string[]): string {
  const fields = Object.entries(record).map(([key, value]) => [normalizeKey(key), value] as const);
  for (const candidate of candidates) {
    const wanted = normalizeKey(candidate);
    const match = fields.find(([key, value]) => key === wanted || key.endsWith(wanted));
    if (match && match[1] !== null && match[1] !== undefined && String(match[1]).trim()) return String(match[1]).trim();
  }
  return '';
}

function toIsoDate(value: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function mapExportRecord(record: ExportRecord): PlayerProfile | null {
  const flattened = flattenRecord(record);
  const playFabId = getExportValue(flattened, ['PlayFabId', 'PlayerId', 'EntityId', 'Id']);
  if (!playFabId) return null;
  const displayName = getExportValue(flattened, ['TitleDisplayName', 'DisplayName', 'Username', 'UserName', 'PlayerName']) || `Player ${playFabId.slice(-6)}`;
  const joinedAt = toIsoDate(getExportValue(flattened, ['Created', 'CreatedAt', 'AccountCreated']));
  const lastLoginAt = toIsoDate(getExportValue(flattened, ['LastLogin', 'LastLoginAt']));
  const bannedUntilRaw = getExportValue(flattened, ['BannedUntil', 'BanExpires']);
  const bannedUntil = bannedUntilRaw ? toIsoDate(bannedUntilRaw) : null;
  const banned = Boolean(bannedUntil && (Number.isNaN(Date.parse(bannedUntil)) || Date.parse(bannedUntil) > Date.now()));
  return {
    id: playFabId,
    playFabId,
    displayName,
    username: displayName,
    email: getExportValue(flattened, ['PrivateInfo.Email', 'ContactEmail', 'PrimaryEmail', 'EmailAddress', 'Email']),
    avatarUrl: getExportValue(flattened, ['AvatarUrl', 'AvatarURL']) || '/assets/crew-team-illustration.png',
    role: 'Player',
    crewId: playFabId,
    bio: '',
    joinedAt,
    lastLoginAt,
    adminStatus: banned ? 'Banned' : 'Active',
    bannedUntil,
  };
}

function getDataValue(data: UserDataMap | undefined, key: string): string {
  const value = data?.[key];
  if (typeof value === 'string') return value;
  return typeof value?.Value === 'string' ? value.Value : '';
}

function parseJson<T>(value: string, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function mapProgression(raw: string, stats: Array<{ StatisticName?: string; Value?: number }>): PlayerProgression {
  const statMap = Object.fromEntries(stats.map((stat) => [String(stat.StatisticName || ''), toNumber(stat.Value)]));
  const parsed = parseJson<Record<string, unknown>>(raw, {});
  const level = toNumber(parsed.level ?? statMap.level, 1);
  const totalXp = toNumber(parsed.totalXp ?? parsed.total_xp ?? statMap.total_xp);
  const highest = toNumber(parsed.highestLevelUnlocked ?? parsed.highest_level ?? statMap.highest_level, level);
  const tutorialProgress = toNumber(parsed.tutorialProgress ?? parsed.tutorial_progress ?? statMap.tutorial_progress);
  return {
    level,
    currentXp: toNumber(parsed.currentXp ?? parsed.xp, totalXp % 10000),
    xpToNextLevel: toNumber(parsed.xpToNextLevel, 10000),
    totalXp,
    highestLevelUnlocked: highest,
    completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels.map(String) : [],
    completedStages: parsed.completedStages && typeof parsed.completedStages === 'object' ? parsed.completedStages as Record<string, string[]> : {},
    tutorialProgress,
    tutorialsCompleted: Boolean(parsed.tutorialsCompleted ?? tutorialProgress >= 100),
    campaignCompleted: Boolean(parsed.campaignCompleted ?? parsed.campaign_completed ?? statMap.campaign_completed),
    multiplayerUnlocked: Boolean(parsed.multiplayerUnlocked ?? parsed.multiplayer_unlocked ?? statMap.multiplayer_unlocked),
    highest_level: highest,
    total_xp: totalXp,
    tutorial_progress: tutorialProgress,
    campaign_completed: Boolean(parsed.campaignCompleted ?? parsed.campaign_completed ?? statMap.campaign_completed) ? 1 : 0,
    multiplayer_unlocked: Boolean(parsed.multiplayerUnlocked ?? parsed.multiplayer_unlocked ?? statMap.multiplayer_unlocked) ? 1 : 0,
  };
}

function mapRoleStatistics(stats: Array<{ StatisticName?: string; Value?: number }>): RoleStatistics[] {
  const roles: RoleStatistics[] = [
    { role: 'director', productions: 0, averageScore: 0, perfectScores: 0, knowledgeUnlocked: 0 },
    { role: 'cameraman', productions: 0, averageScore: 0, perfectScores: 0, knowledgeUnlocked: 0 },
    { role: 'av_technician', productions: 0, averageScore: 0, perfectScores: 0, knowledgeUnlocked: 0 },
    { role: 'editor', productions: 0, averageScore: 0, perfectScores: 0, knowledgeUnlocked: 0 },
  ];
  for (const stat of stats) {
    const name = String(stat.StatisticName || '').toLowerCase();
    const role = roles.find((candidate) => name.startsWith(`${candidate.role}_`) || (candidate.role === 'av_technician' && name.startsWith('av_tech_')));
    if (!role) continue;
    const value = toNumber(stat.Value);
    if (name.includes('productions')) role.productions = value;
    if (name.includes('avg_score')) role.averageScore = value;
    if (name.includes('perfect')) role.perfectScores = value;
  }
  return roles;
}

function parseRuntimeMinutes(value: unknown): number {
  const text = String(value || '').toLowerCase();
  const hours = Number(text.match(/(\d+)\s*h/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+)\s*m/)?.[1] || 0);
  return hours * 60 + minutes;
}

function formatPlaytime(minutes: number): string {
  if (!minutes) return '0h 0m';
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatAdminTimestamp(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function mapTransactions(orders: PayMongoOrder[]): AdminPlayerTransaction[] {
  return orders
    .filter((order) => order.currency === 'PHP')
    .map((order) => ({
      id: order.id,
      type: 'C-Coin Top-Up',
      item: `${order.coins.toLocaleString()} C-Coins`,
      amount: `PHP ${(order.amountInCentavos / 100).toFixed(2)}`,
      status: order.status === 'fulfilled' ? 'Completed' : order.status === 'failed' ? 'Failed' : 'Pending',
      date: formatAdminTimestamp(order.paidAt || order.updatedAt || order.createdAt),
    }));
}

function buildActivity(
  productionLogs: ReturnType<typeof mapDataToProductionLogs>,
  achievements: ReturnType<typeof mapDataToAchievements>,
  transactions: AdminPlayerTransaction[],
): AdminPlayerActivity[] {
  const activities: Array<AdminPlayerActivity & { sortAt: number }> = [];
  productionLogs.forEach((log) => {
    const timestamp = log.date || log.completedAt || '';
    activities.push({
      id: `production-${log.productionId || log.id}`,
      label: 'Completed production',
      detail: `${log.title || log.stage || 'Production'}${log.overallScore ? ` — ${log.overallScore}% score` : ''}`,
      timestamp: formatAdminTimestamp(timestamp),
      sortAt: Date.parse(timestamp) || 0,
    });
  });
  achievements.filter((achievement) => achievement.unlocked).forEach((achievement) => {
    const timestamp = achievement.unlockedAt || '';
    activities.push({
      id: `achievement-${achievement.id}`,
      label: 'Achievement unlocked',
      detail: achievement.title || achievement.name || achievement.id,
      timestamp: formatAdminTimestamp(timestamp),
      sortAt: Date.parse(timestamp) || 0,
    });
  });
  transactions.forEach((transaction) => {
    activities.push({
      id: `transaction-${transaction.id}`,
      label: 'C-Coin top-up',
      detail: `${transaction.item} — ${transaction.amount}`,
      timestamp: transaction.date,
      sortAt: Date.parse(transaction.date) || 0,
    });
  });
  return activities.sort((a, b) => b.sortAt - a.sortAt).slice(0, 8).map(({ sortAt: _sortAt, ...activity }) => activity);
}

function isAdminTag(tag: unknown): boolean {
  if (typeof tag !== 'string') return false;
  const normalized = tag.toLowerCase();
  return normalized === 'role:admin' || normalized.endsWith(':role:admin') || normalized.endsWith('.role:admin');
}

async function getPlayerTags(playFabId: string, secretKey: string): Promise<string[]> {
  const data = await playFabServerRequest<{ Tags?: string[] }>('/Server/GetPlayerTags', { PlayFabId: playFabId }, secretKey);
  return data.Tags ?? [];
}

async function getBanState(playFabId: string, secretKey: string): Promise<{ status: 'Active' | 'Banned'; bannedUntil: string | null }> {
  const data = await playFabServerRequest<{ BanData?: BanRecord[] }>('/Server/GetUserBans', { PlayFabId: playFabId }, secretKey);
  const active = (data.BanData ?? []).find((ban) => {
    if (!ban.Active) return false;
    if (!ban.Expires) return true;
    const expiresAt = Date.parse(ban.Expires);
    return Number.isNaN(expiresAt) || expiresAt > Date.now();
  });
  return { status: active ? 'Banned' : 'Active', bannedUntil: active?.Expires ? toIsoDate(active.Expires) : null };
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getSegmentExportIndexUrl(exportId: string, secretKey: string): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const exportData = await playFabServerRequest<SegmentExport>('/Server/GetSegmentExport', { ExportId: exportId }, secretKey);
    if (exportData.IndexUrl) return exportData.IndexUrl;
    const state = String(exportData.State || '').toLowerCase();
    if (state.includes('fail') || state.includes('error')) throw new Error(`PlayFab player export failed with state ${exportData.State}`);
    if (attempt < 14) await wait(500);
  }
  throw new Error('PlayFab player export is still processing. Please try again shortly.');
}

async function loadAllPlayers(secretKey: string, excludedPlayFabId?: string): Promise<PlayerProfile[]> {
  const now = Date.now();
  if (playerCache && playerCache.expiresAt > now) return playerCache.players;
  if (playerRequest) return playerRequest;

  playerRequest = (async () => {
    const segmentData = await playFabServerRequest<{ Segments?: Segment[] }>('/Server/GetAllSegments', {}, secretKey);
    const allPlayersSegment = (segmentData.Segments || []).find((segment) => String(segment.Name || '').trim().toLowerCase() === 'all players');
    if (!allPlayersSegment?.Id) throw new Error('PlayFab could not find the All Players segment.');
    const exportData = await playFabServerRequest<{ ExportId?: string }>('/Server/ExportPlayersInSegment', { SegmentId: allPlayersSegment.Id }, secretKey);
    if (!exportData.ExportId) throw new Error('PlayFab did not return a player export ID.');
    const indexUrl = await getSegmentExportIndexUrl(exportData.ExportId, secretKey);
    const indexResponse = await fetch(indexUrl);
    if (!indexResponse.ok) throw new Error('PlayFab player export index could not be downloaded.');
    const fragmentUrls = (await indexResponse.text()).split(/\r?\n/).map((line) => line.trim()).filter((line) => /^https?:\/\//i.test(line));
    const fragments = await Promise.all(fragmentUrls.map(async (fragmentUrl) => {
      const response = await fetch(fragmentUrl);
      if (!response.ok) throw new Error('A PlayFab player export fragment could not be downloaded.');
      return response.text();
    }));
    const players = fragments.flatMap(parseExportFragment).map(mapExportRecord).filter((player): player is PlayerProfile => Boolean(player));
    const uniquePlayers = Array.from(new Map(players.map((player) => [player.playFabId, player])).values()).filter((player) => player.playFabId !== excludedPlayFabId && !pendingDeletedPlayerIds.has(player.playFabId));

    const playerStates = await Promise.all(uniquePlayers.map(async (player) => {
      const tags = await getPlayerTags(player.playFabId, secretKey);
      if (tags.some(isAdminTag)) return null;
      const ban = await getBanState(player.playFabId, secretKey);
      return { ...player, adminStatus: ban.status, bannedUntil: ban.bannedUntil };
    }));
    const nonAdminPlayers = playerStates.filter((player): player is PlayerProfile => Boolean(player));
    nonAdminPlayers.sort((a, b) => {
      const aTime = Date.parse(a.joinedAt || '') || 0;
      const bTime = Date.parse(b.joinedAt || '') || 0;
      return bTime - aTime;
    });
    playerCache = { expiresAt: Date.now() + PLAYER_CACHE_TTL_MS, players: nonAdminPlayers };
    return nonAdminPlayers;
  })();

  try { return await playerRequest; } finally { playerRequest = null; }
}

function mapAccountInfo(account: Record<string, any>, lastLogin: string) {
  const linked = Array.isArray(account['LinkedAccounts']) ? account['LinkedAccounts'] as Array<Record<string, unknown>> : [];
  const origination = String(account['TitleInfo']?.['Origination'] || '').trim();
  const linkedPlatform = String(linked[0]?.['Platform'] || '').trim();
  const platform = origination || linkedPlatform || 'Not available';
  const loginMethod = linkedPlatform
    ? linkedPlatform.replace('GooglePlay', 'Google')
    : account['Username'] ? 'PlayFab username' : account['PrivateInfo']?.['Email'] ? 'Email' : 'Not available';
  return {
    platform,
    device: String(account['TitleInfo']?.['Device'] || account['Device'] || 'Not available'),
    loginMethod,
    twoFactor: 'Not available',
    lastLogin: formatAdminTimestamp(lastLogin),
    ...(account['TitleInfo']?.['LastLoginIP'] ? { lastIp: String(account['TitleInfo']['LastLoginIP']) } : {}),
  };
}

async function loadRealPlayerDetails(playerId: string, secretKey: string): Promise<AdminPlayerDetails> {
  const response = await playFabServerRequest<{
    InfoResultPayload?: {
      PlayerProfile?: Record<string, unknown>;
      AccountInfo?: Record<string, any>;
      UserVirtualCurrency?: Record<string, number>;
      UserInventory?: unknown[];
      PlayerStatistics?: Array<{ StatisticName?: string; Value?: number }>;
      UserData?: UserDataMap;
    };
  }>('/Server/GetPlayerCombinedInfo', {
    PlayFabId: playerId,
    InfoRequestParameters: {
      GetPlayerProfile: true,
      GetUserAccountInfo: true,
      GetPlayerStatistics: true,
      GetUserData: true,
      GetUserInventory: true,
      GetUserVirtualCurrency: true,
    },
  }, secretKey);

  const info = response.InfoResultPayload;
  const profileRecord = info?.PlayerProfile || {};
  const account = info?.AccountInfo || {};
  const userData = info?.UserData || {};
  const rawMetadata = parseJson<Record<string, unknown>>(getDataValue(userData, PLAYFAB_DATA_KEYS.profile_metadata), {});
  const rawStats = info?.PlayerStatistics || [];
  const lastLoginAt = account['TitleInfo']?.['LastLogin'] ? new Date(account['TitleInfo']['LastLogin']).toISOString() : '';
  const ban = await getBanState(playerId, secretKey);
  const progression = mapProgression(getDataValue(userData, PLAYFAB_DATA_KEYS.progression), rawStats);
  const productionLogs = mapDataToProductionLogs(parseJson<unknown>(getDataValue(userData, PLAYFAB_DATA_KEYS.production_logs), []));
  const achievements = mapDataToAchievements(parseJson<unknown>(getDataValue(userData, PLAYFAB_DATA_KEYS.achievements), []));
  const orders = await getWebsiteRecords<PayMongoOrder>(WEBSITE_DATA_KEYS.paymongoOrders, secretKey);
  const transactions = mapTransactions(orders.filter((order) => order.playFabId === playerId));
  const activity = buildActivity(productionLogs, achievements, transactions);
  const statsByName = Object.fromEntries(rawStats.map((stat) => [String(stat.StatisticName || '').toLowerCase(), toNumber(stat.Value)]));
  const playtimeMinutes = productionLogs.reduce((total, log) => total + parseRuntimeMinutes(log.runtime), 0) || toNumber(statsByName.playtime_minutes);
  const productionScore = productionLogs.reduce((total, log) => total + toNumber(log.overallScore), 0) || toNumber(statsByName.production_score);
  const gamesPlayed = productionLogs.length || toNumber(statsByName.games_played ?? statsByName.gamesplayed);
  const username = String(rawMetadata.username || profileRecord['DisplayName'] || account['Username'] || 'Player');
  const email = String(account['PrivateInfo']?.['Email'] || rawMetadata.email || '');
  const joinedAt = account['Created'] ? new Date(account['Created']).toISOString() : '';
  const profile: PlayerProfile = {
    id: playerId,
    playFabId: playerId,
    displayName: username,
    username,
    email,
    avatarUrl: typeof profileRecord['AvatarUrl'] === 'string' ? profileRecord['AvatarUrl'] : '/assets/crew-team-illustration.png',
    role: String(rawMetadata.primaryRole || profileRecord['PrimaryRole'] || 'Player'),
    crewId: String(rawMetadata.crewId || playerId),
    bio: typeof rawMetadata.bio === 'string' ? rawMetadata.bio : '',
    socialLinks: rawMetadata.socialLinks && typeof rawMetadata.socialLinks === 'object' ? rawMetadata.socialLinks as PlayerProfile['socialLinks'] : {},
    joinedAt,
    lastLoginAt,
    adminStatus: ban.status,
    bannedUntil: ban.bannedUntil,
  };

  return {
    profile,
    progression,
    wallet: {
      bCoins: info?.UserVirtualCurrency?.['BC'] ?? 0,
      cCoins: info?.UserVirtualCurrency?.[getCcoinCurrencyCode()] ?? 0,
    },
    inventory: (info?.UserInventory || []) as AdminPlayerDetails['inventory'],
    achievements,
    statistics: mapRoleStatistics(rawStats),
    productionLogs,
    transactions,
    activity,
    accountInfo: mapAccountInfo(account, lastLoginAt),
    career: { productionScore, gamesPlayed, playtime: formatPlaytime(playtimeMinutes) },
  };
}

async function resetPlayerData(playerId: string, secretKey: string): Promise<void> {
  const current = await playFabServerRequest<{
    UserInventory?: Array<{ ItemInstanceId?: string }>;
    UserVirtualCurrency?: Record<string, number>;
  }>('/Server/GetPlayerCombinedInfo', {
    PlayFabId: playerId,
    InfoRequestParameters: { GetUserInventory: true, GetUserVirtualCurrency: true },
  }, secretKey);
  await playFabServerRequest('/Admin/ResetUserStatistics', { PlayFabId: playerId }, secretKey);
  await playFabServerRequest('/Server/UpdateUserData', {
    PlayFabId: playerId,
    KeysToRemove: [
      PLAYFAB_DATA_KEYS.progression,
      PLAYFAB_DATA_KEYS.stats,
      PLAYFAB_DATA_KEYS.loadout,
      PLAYFAB_DATA_KEYS.almanac_unlocked,
      PLAYFAB_DATA_KEYS.production_logs,
      PLAYFAB_DATA_KEYS.transactions,
      PLAYFAB_DATA_KEYS.notifications,
      PLAYFAB_DATA_KEYS.achievements,
      PLAYFAB_DATA_KEYS.knowledge,
    ],
  }, secretKey);

  const inventory = current.UserInventory || [];
  for (let offset = 0; offset < inventory.length; offset += 25) {
    const items = inventory.slice(offset, offset + 25).filter((item) => item.ItemInstanceId).map((item) => ({
      PlayFabId: playerId,
      ItemInstanceId: item.ItemInstanceId,
    }));
    if (items.length) await playFabServerRequest('/Admin/RevokeInventoryItems', { Items: items }, secretKey);
  }
  for (const [currency, balance] of Object.entries(current.UserVirtualCurrency || {})) {
    const amount = toNumber(balance);
    if (amount > 0) await playFabServerRequest('/Server/SubtractUserVirtualCurrency', { PlayFabId: playerId, VirtualCurrency: currency, Amount: amount }, secretKey);
  }

}

async function deletePlayerAccount(playerId: string, secretKey: string): Promise<void> {
  await playFabServerRequest('/Server/BanUsers', { Bans: [{ PlayFabId: playerId, Reason: 'Account deletion pending.' }] }, secretKey);
  await playFabServerRequest('/Admin/DeleteMasterPlayerAccount', { PlayFabId: playerId }, secretKey);
  pendingDeletedPlayerIds.add(playerId);
}

export const Route = createFileRoute('/api/admin/players')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request, { requireAdmin: true });
        if (!session) return unauthorizedSessionResponse();
        const url = new URL(request.url);
        const playerId = url.searchParams.get('id');
        const secretKey = getSecretKey();
        if (!secretKey) return Response.json({ success: false, error: 'PLAYFAB_SECRET_KEY is not configured on the server.' }, { status: 503 });
        try {
          if (playerId) return Response.json({ success: true, data: await loadRealPlayerDetails(playerId, secretKey) });
          return Response.json({ success: true, data: await loadAllPlayers(secretKey, session.playFabId) });
        } catch (error) {
          console.error('[API] GET admin/players error:', error);
          return Response.json({ success: false, error: error instanceof Error ? error.message : 'Unable to load players from PlayFab.' }, { status: 502 });
        }
      },
      POST: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) return unauthorizedSessionResponse();
        const secretKey = getSecretKey();
        if (!secretKey) return Response.json({ success: false, error: 'PLAYFAB_SECRET_KEY is not configured on the server.' }, { status: 503 });
        try {
          const body = await request.json() as { action?: string; ids?: unknown; id?: unknown; status?: unknown; bannedUntil?: unknown };
          const ids = Array.from(new Set([
            ...(Array.isArray(body.ids) ? body.ids : []),
            ...(typeof body.id === 'string' ? [body.id] : []),
          ].map(String).map((id) => id.trim()).filter(Boolean)));
          if (!ids.length) return Response.json({ success: false, error: 'At least one player is required.' }, { status: 400 });
          if (body.action === 'status') {
            if (body.status !== 'Active' && body.status !== 'Banned') return Response.json({ success: false, error: 'Status must be Active or Banned.' }, { status: 400 });
            if (body.status === 'Active') {
              await Promise.all(ids.map((id) => playFabServerRequest('/Server/RevokeAllBansForUser', { PlayFabId: id }, secretKey)));
            } else {
              const until = typeof body.bannedUntil === 'string' ? Date.parse(body.bannedUntil) : NaN;
              if (typeof body.bannedUntil === 'string' && Number.isNaN(until)) return Response.json({ success: false, error: 'Choose a valid ban expiry.' }, { status: 400 });
              const duration = Number.isFinite(until) ? Math.max(1, Math.ceil((until - Date.now()) / 3600000)) : undefined;
              await playFabServerRequest('/Server/BanUsers', {
                Bans: ids.map((id) => ({ PlayFabId: id, Reason: 'Account banned by a studio administrator.', ...(duration ? { DurationInHours: duration } : {}) })),
              }, secretKey);
            }
          } else if (body.action === 'reset') {
            await Promise.all(ids.map((id) => resetPlayerData(id, secretKey)));
          } else if (body.action === 'delete') {
            await Promise.all(ids.map((id) => deletePlayerAccount(id, secretKey)));
          } else {
            return Response.json({ success: false, error: 'Unsupported player action.' }, { status: 400 });
          }
          playerCache = null;
          return Response.json({ success: true });
        } catch (error) {
          console.error('[API] POST admin/players error:', error);
          return Response.json({ success: false, error: error instanceof Error ? error.message : 'The player action could not be completed.' }, { status: 502 });
        }
      },
    },
  },
});