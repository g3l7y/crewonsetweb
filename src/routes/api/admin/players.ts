import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import { PLAYFAB_API_BASE } from '@/lib/playfab/config';
import { getCcoinCurrencyCode } from '@/lib/playfab/economy';
import type { PlayerProfile } from '@/lib/playfab/types';

type PlayFabResponse<T> = {
  code?: number;
  errorMessage?: string;
  data?: T;
};

type Segment = {
  Id?: string;
  Name?: string;
};

type SegmentExport = {
  State?: string;
  IndexUrl?: string;
};

type ExportRecord = Record<string, unknown>;

type CachedPlayers = {
  expiresAt: number;
  players: PlayerProfile[];
};

const PLAYER_CACHE_TTL_MS = 60_000;
let playerCache: CachedPlayers | null = null;
let playerRequest: Promise<PlayerProfile[]> | null = null;

function getSecretKey(): string | null {
  return process.env['PLAYFAB_SECRET_KEY'] || null;
}

async function playFabServerRequest<T>(path: string, body: Record<string, unknown>, secretKey: string): Promise<T> {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SecretKey': secretKey,
    },
    body: JSON.stringify(body),
  });

  const result = (await response.json().catch(() => ({}))) as PlayFabResponse<T>;

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

    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      flattenRecord(entry, nextKey, output);
    } else {
      output[nextKey] = entry;
    }
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
      } else {
        quoted = !quoted;
      }
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

  const headers = parseDelimitedLine(lines[0] ?? "");
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
    try {
      return recordsFromJson(JSON.parse(trimmed));
    } catch {
      // Some exports can contain JSON-like fields but still be TSV. Continue with TSV parsing.
    }
  }

  return parseTsv(text);
}

function getExportValue(record: ExportRecord, candidates: string[]): string {
  const fields = Object.entries(record).map(([key, value]) => [normalizeKey(key), value] as const);

  for (const candidate of candidates) {
    const wanted = normalizeKey(candidate);
    const match = fields.find(([key, value]) => key === wanted || key.endsWith(wanted));

    if (match && match[1] !== null && match[1] !== undefined && String(match[1]).trim()) {
      return String(match[1]).trim();
    }
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

  const displayName = getExportValue(flattened, [
    'TitleDisplayName',
    'DisplayName',
    'Username',
    'UserName',
    'PlayerName',
  ]) || `Player ${playFabId.slice(-6)}`;
  const email = getExportValue(flattened, [
    'PrivateInfo.Email',
    'ContactEmail',
    'PrimaryEmail',
    'EmailAddress',
    'Email',
  ]);
  const joinedAt = toIsoDate(getExportValue(flattened, ['Created', 'CreatedAt', 'AccountCreated']));
  const lastLoginAt = toIsoDate(getExportValue(flattened, ['LastLogin', 'LastLoginAt']));
  const avatarUrl = getExportValue(flattened, ['AvatarUrl', 'AvatarURL']);

  return {
    id: playFabId,
    playFabId,
    displayName,
    username: displayName,
    email,
    avatarUrl: avatarUrl || '/assets/crew-team-illustration.png',
    role: 'Player',
    crewId: playFabId,
    bio: '',
    joinedAt,
    lastLoginAt,
  };
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getSegmentExportIndexUrl(exportId: string, secretKey: string): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const exportData = await playFabServerRequest<SegmentExport>('/Server/GetSegmentExport', { ExportId: exportId }, secretKey);

    if (exportData.IndexUrl) return exportData.IndexUrl;

    const state = String(exportData.State || '').toLowerCase();
    if (state.includes('fail') || state.includes('error')) {
      throw new Error(`PlayFab player export failed with state ${exportData.State}`);
    }

    if (attempt < 14) await wait(500);
  }

  throw new Error('PlayFab player export is still processing. Please try again shortly.');
}

async function loadAllPlayers(secretKey: string): Promise<PlayerProfile[]> {
  const now = Date.now();
  if (playerCache && playerCache.expiresAt > now) return playerCache.players;
  if (playerRequest) return playerRequest;

  playerRequest = (async () => {
    const segmentData = await playFabServerRequest<{ Segments?: Segment[] }>('/Server/GetAllSegments', {}, secretKey);
    const allPlayersSegment = (segmentData.Segments || []).find(
      (segment) => String(segment.Name || '').trim().toLowerCase() === 'all players',
    );

    if (!allPlayersSegment?.Id) {
      throw new Error('PlayFab could not find the All Players segment.');
    }

    const exportData = await playFabServerRequest<{ ExportId?: string }>(
      '/Server/ExportPlayersInSegment',
      { SegmentId: allPlayersSegment.Id },
      secretKey,
    );

    if (!exportData.ExportId) throw new Error('PlayFab did not return a player export ID.');

    const indexUrl = await getSegmentExportIndexUrl(exportData.ExportId, secretKey);
    const indexResponse = await fetch(indexUrl);
    if (!indexResponse.ok) throw new Error('PlayFab player export index could not be downloaded.');

    const fragmentUrls = (await indexResponse.text())
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^https?:\/\//i.test(line));

    const fragments = await Promise.all(
      fragmentUrls.map(async (fragmentUrl) => {
        const response = await fetch(fragmentUrl);
        if (!response.ok) throw new Error('A PlayFab player export fragment could not be downloaded.');
        return response.text();
      }),
    );

    const players = fragments.flatMap(parseExportFragment).map(mapExportRecord).filter((player): player is PlayerProfile => Boolean(player));
    const uniquePlayers = Array.from(new Map(players.map((player) => [player.playFabId, player])).values());

    if (uniquePlayers.length === 0) throw new Error('PlayFab returned an empty or unreadable player export.');

    playerCache = { expiresAt: Date.now() + PLAYER_CACHE_TTL_MS, players: uniquePlayers };
    return uniquePlayers;
  })();

  try {
    return await playerRequest;
  } finally {
    playerRequest = null;
  }
}

export const Route = createFileRoute('/api/admin/players')({
  server: {
    handlers: {
      /** GET — fetch real players from PlayFab Server API (admin-only). */
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }

        const url = new URL(request.url);
        const playerId = url.searchParams.get('id');
        const secretKey = getSecretKey();

        if (!secretKey) {
          return Response.json(
            { success: false, error: 'PLAYFAB_SECRET_KEY is not configured on the server.' },
            { status: 503 },
          );
        }

        try {
          if (playerId) {
            const response = await playFabServerRequest<{
              InfoResultPayload?: {
                PlayerProfile?: Record<string, unknown>;
                AccountInfo?: Record<string, any>;
                UserVirtualCurrency?: Record<string, number>;
                UserInventory?: unknown[];
                PlayerStatistics?: unknown[];
                UserData?: Record<string, unknown>;
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
            const profile = info?.PlayerProfile || {};
            const account = info?.AccountInfo || {};
            const currencies = info?.UserVirtualCurrency || {};

            return Response.json({
              success: true,
              data: {
                profile: {
                  id: playerId,
                  playFabId: playerId,
                  displayName: profile['DisplayName'] || account['TitleInfo']?.['DisplayName'] || 'Player',
                  username: profile['DisplayName'] || account['Username'] || 'player',
                  email: account['PrivateInfo']?.['Email'] || '',
                  avatarUrl: profile['AvatarUrl'] || '/assets/crew-team-illustration.png',
                  role: 'cameraman',
                  crewId: 'CREW-001',
                  bio: '',
                  joinedAt: account['Created'] ? new Date(account['Created']).toISOString() : '',
                  lastLoginAt: account['TitleInfo']?.['LastLogin'] ? new Date(account['TitleInfo']['LastLogin']).toISOString() : '',
                },
                wallet: {
                  bCoins: currencies['BC'] ?? 0,
                  cCoins: currencies[getCcoinCurrencyCode()] ?? 0,
                },
                inventory: info?.UserInventory || [],
                statistics: info?.PlayerStatistics || [],
                userData: info?.UserData || {},
              },
            });
          }

          const players = await loadAllPlayers(secretKey);
          return Response.json({ success: true, data: players });
        } catch (error) {
          console.error('[API] GET admin/players error:', error);
          const message = error instanceof Error ? error.message : 'Unable to load players from PlayFab.';
          return Response.json({ success: false, error: message }, { status: 502 });
        }
      },
    },
  },
});