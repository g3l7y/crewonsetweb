import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from "./config";

/**
 * PlayFab-backed website operational data storage.
 *
 * Uses Title Internal Data (/Server/GetTitleInternalData + /Server/SetTitleInternalData)
 * for server-only persistent records. Title Internal Data is NOT readable from the
 * client, providing an additional security boundary.
 *
 * Each collection type gets its own key. Paginated keys are used when a single
 * key nears the 10 KB PlayFab limit.
 *
 * @server SERVER-ONLY — never import or call from client/browser code.
 */

// ============================================================================
// Constants
// ============================================================================

/** Max bytes per Title Internal Data value (PlayFab limit is 10,000 bytes). */
const MAX_VALUE_BYTES = 9500; // Leave headroom for encoding overhead

/** Well-known collection keys for website operational data. */
export const WEBSITE_DATA_KEYS = {
  bugReports: "website_bug_reports",
  playerReports: "website_player_reports",
  partnerships: "website_partnerships",
  notifications: "website_admin_notifications",
  playerNotifications: "website_player_notifications",
  playerMail: "website_player_mail",
  settings: "website_settings",
  paymongoOrders: "website_paymongo_orders",
  partnershipPayments: "website_partnership_payments",
} as const;

export type WebsiteDataKey = (typeof WEBSITE_DATA_KEYS)[keyof typeof WEBSITE_DATA_KEYS];

// ============================================================================
// Low-level PlayFab helpers (server-only)
// ============================================================================

async function callPlayFabServer<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  secretKey: string,
): Promise<T> {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SecretKey": secretKey,
    },
    body: JSON.stringify({ ...body, TitleId: PLAYFAB_TITLE_ID }),
  });

  const json = await response.json();

  if (!response.ok || json.code !== 200) {
    const msg = json.errorMessage ?? json.status ?? "PlayFab Server API error";
    throw new Error(`[PlayFab] ${path} failed: ${msg}`);
  }

  return json.data as T;
}

/** Read one or more Title Internal Data keys. */
async function getTitleInternalData(
  keys: string[],
  secretKey: string,
): Promise<Record<string, string>> {
  const data = await callPlayFabServer<{ Data: Record<string, string> }>(
    "/Server/GetTitleInternalData",
    { Keys: keys },
    secretKey,
  );
  return data.Data || {};
}

/** Write a single Title Internal Data key. */
async function setTitleInternalData(key: string, value: string, secretKey: string): Promise<void> {
  await callPlayFabServer("/Server/SetTitleInternalData", { Key: key, Value: value }, secretKey);
}

// ============================================================================
// Generic value helpers
// ============================================================================

/** Read one JSON value from Title Internal Data (server-only). */
export async function getWebsiteValue<T>(key: string, secretKey: string): Promise<T | null> {
  try {
    const data = await getTitleInternalData([key], secretKey);
    const raw = data[key];
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[WebsiteData] Error reading ${key}:`, error);
    return null;
  }
}

/** Write one JSON value to Title Internal Data (server-only). */
export async function setWebsiteValue<T>(
  key: string,
  value: T,
  secretKey: string,
): Promise<boolean> {
  try {
    await setTitleInternalData(key, JSON.stringify(value), secretKey);
    return true;
  } catch (error) {
    console.error(`[WebsiteData] Error writing ${key}:`, error);
    return false;
  }
}
// ============================================================================
// Collection CRUD helpers
// ============================================================================

interface Identifiable {
  id: string;
}

/**
 * Fetch all records from a paginated Title Internal Data collection.
 * Reads the primary key and any overflow pages (_p1, _p2, ...).
 */
export async function getWebsiteRecords<T extends Identifiable>(
  collectionKey: string,
  secretKey: string,
): Promise<T[]> {
  try {
    // Read the primary key first
    const primary = await getTitleInternalData([collectionKey], secretKey);
    const rawPrimary = primary[collectionKey];
    if (!rawPrimary) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawPrimary);
    } catch {
      console.error(`[WebsiteData] Failed to parse ${collectionKey}`);
      return [];
    }

    // Check if it's a paginated container
    if (
      parsed &&
      typeof parsed === "object" &&
      "pages" in parsed &&
      typeof (parsed as Record<string, unknown>)["pages"] === "number"
    ) {
      const meta = parsed as { pages: number; total: number };
      const pageKeys = Array.from({ length: meta.pages }, (_, i) => `${collectionKey}_p${i}`);
      const pageData = await getTitleInternalData(pageKeys, secretKey);
      const allRecords: T[] = [];
      for (const pk of pageKeys) {
        if (pageData[pk]) {
          try {
            const pageRecords = JSON.parse(pageData[pk]) as T[];
            allRecords.push(...pageRecords);
          } catch {
            console.warn(`[WebsiteData] Failed to parse page ${pk}`);
          }
        }
      }
      return allRecords;
    }

    // Simple (non-paginated) array
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }

    return [];
  } catch (error) {
    console.error(`[WebsiteData] Error reading ${collectionKey}:`, error);
    return [];
  }
}

/**
 * Save a full collection of records. Automatically paginates if the data
 * exceeds a single key's capacity.
 */
export async function setWebsiteRecords<T extends Identifiable>(
  collectionKey: string,
  records: T[],
  secretKey: string,
): Promise<boolean> {
  try {
    const fullJson = JSON.stringify(records);

    // If it fits in one key, store as a simple array
    if (new TextEncoder().encode(fullJson).length <= MAX_VALUE_BYTES) {
      await setTitleInternalData(collectionKey, fullJson, secretKey);
      return true;
    }

    // Paginate: split records into pages that fit
    const pages: T[][] = [];
    let currentPage: T[] = [];
    let currentSize = 2; // Account for "[]"

    for (const record of records) {
      const recordJson = JSON.stringify(record);
      const recordSize = new TextEncoder().encode(recordJson).length + 1; // +1 for comma
      if (currentSize + recordSize > MAX_VALUE_BYTES && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentSize = 2;
      }
      currentPage.push(record);
      currentSize += recordSize;
    }
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    // Write the index key
    await setTitleInternalData(
      collectionKey,
      JSON.stringify({ pages: pages.length, total: records.length }),
      secretKey,
    );

    // Write each page
    for (let i = 0; i < pages.length; i++) {
      await setTitleInternalData(`${collectionKey}_p${i}`, JSON.stringify(pages[i]), secretKey);
    }

    return true;
  } catch (error) {
    console.error(`[WebsiteData] Error writing ${collectionKey}:`, error);
    return false;
  }
}

/**
 * Append a new record to a collection.
 */
export async function appendWebsiteRecord<T extends Identifiable>(
  collectionKey: string,
  record: T,
  secretKey: string,
): Promise<boolean> {
  const existing = await getWebsiteRecords<T>(collectionKey, secretKey);
  return setWebsiteRecords(collectionKey, [record, ...existing], secretKey);
}

/**
 * Update a record by ID using an updater function.
 */
export async function updateWebsiteRecord<T extends Identifiable>(
  collectionKey: string,
  id: string,
  updater: (record: T) => T,
  secretKey: string,
): Promise<boolean> {
  const existing = await getWebsiteRecords<T>(collectionKey, secretKey);
  const idx = existing.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  const current = existing[idx];
  if (!current) return false;
  existing[idx] = updater(current);
  return setWebsiteRecords(collectionKey, existing, secretKey);
}

/**
 * Delete one or more records by ID.
 */
export async function deleteWebsiteRecords<T extends Identifiable>(
  collectionKey: string,
  ids: string[],
  secretKey: string,
): Promise<boolean> {
  const idSet = new Set(ids);
  const existing = await getWebsiteRecords<T>(collectionKey, secretKey);
  const filtered = existing.filter((r) => !idSet.has(r.id));
  return setWebsiteRecords(collectionKey, filtered, secretKey);
}

// ============================================================================
// Title Data helpers (public title-wide configuration, readable by clients)
// ============================================================================

/**
 * @server SERVER-ONLY. Fetch public Title Data keys.
 */
export async function getTitleData(
  keys: string[],
  secretKey: string,
): Promise<Record<string, string>> {
  try {
    const data = await callPlayFabServer<{ Data: Record<string, string> }>(
      "/Server/GetTitleData",
      { Keys: keys },
      secretKey,
    );
    return data.Data || {};
  } catch (error) {
    console.error("Error fetching title data:", error);
    return {};
  }
}

/**
 * @server SERVER-ONLY. Write a public Title Data key.
 */
export async function setTitleData(
  key: string,
  value: string,
  secretKey: string,
): Promise<boolean> {
  try {
    await callPlayFabServer("/Server/SetTitleData", { Key: key, Value: value }, secretKey);
    return true;
  } catch (error) {
    console.error("Error setting title data:", error);
    return false;
  }
}
