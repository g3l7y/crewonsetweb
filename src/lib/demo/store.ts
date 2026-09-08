/**
 * Static / localStorage-backed demo data layer.
 *
 * Everything here is mock data shaped so it can later be swapped for PlayFab
 * calls without touching the UI: each entity has a flat, serialisable shape and
 * every mutation goes through a single `update*` helper.
 */

import { useEffect, useRef, useState } from "react";

import { getSupabaseClient, uploadAttachment } from "@/lib/supabase";

/* ---------------------------------------------------------------- utilities */

const sharedTables: Record<string, string> = {
  "cos.playerReports": "cos_player_reports",
  "cos.bugReports": "cos_bug_reports",
  "cos.adminNotifications": "cos_admin_notifications",
  "cos.applications": "cos_partnership_applications",
};

function toDatabaseRow(item: Record<string, unknown>) {
  const row = Object.fromEntries(
    Object.entries(item).map(([key, value]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      value === undefined ? null : value,
    ]),
  );

  // The partnership table calls the UI's fileName field attachment_name.
  if ("file_name" in row) {
    row["attachment_name"] = row["file_name"];
    delete row["file_name"];
  }

  return row;
}

function fromDatabaseRow<T>(row: Record<string, unknown>): T {
  const item = Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => key !== "created_at")
      .map(([key, value]) => [
        key === "attachment_name"
          ? "fileName"
          : key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        value ?? undefined,
      ]),
  ) as Record<string, unknown>;
  return item as T;
}

function timestampFor(key: string, item: Record<string, unknown>) {
  const fields = key === "cos.adminNotifications"
    ? ["createdAt"]
    : key === "cos.applications"
      ? ["submittedAt", "createdAt", "updatedAt"]
      : ["submittedAt", "createdAt", "updatedAt"];
  for (const field of fields) {
    const value = item[field];
    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return Date.parse(value);
  }
  return 0;
}

const sharedKeys = new Set(["cos.playerReports", "cos.bugReports", "cos.applications"]);

type SupabaseError = { message: string; details?: string; hint?: string; code?: string };

export function logSupabaseError(operation: string, table: string, id: string | undefined, error: SupabaseError) {
  console.error(`[Crew On Set] ${operation} FAILED`, {
    table: `public.${table}`,
    ...(id ? { id } : {}),
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
}

async function verifyDeletedRows(table: string, ids: string[]) {
  const { data, error } = await getSupabaseClient().from(table).select("id").in("id", ids);
  if (error) {
    logSupabaseError("DELETE VERIFICATION", table, ids.join(","), error);
    return false;
  }
  const remaining = (data ?? []).map((row) => String((row as { id: string }).id));
  if (remaining.length) {
    console.error("[Crew On Set] BUG DELETE VERIFICATION FAILED", {
      table: `public.${table}`,
      requestedIds: ids,
      remainingIds: remaining,
    });
    return false;
  }
  return true;
}

export const reportStatusColors = {
  New: "#F3C747",
  Investigating: "#F39A5A",
  Resolved: "#4BC4B4",
} as const;

export const partnershipStatusColors = {
  Pending: "#F3C747",
  Approved: "#4BC4B4",
  "On-going": "#37C8C0",
  Done: "#4E8FE7",
  Declined: "#FF6248",
} as const;

function logSupabaseMutation(table: string, operation: string, id: string, error: { message: string; details?: string; hint?: string }) {
  logSupabaseError(operation, table, id, error);
}

export async function insertSharedRecord<T extends { id: string }>(key: string, item: T, onError?: (message: string) => void) {
  const table = sharedTables[key];
  if (!table || !sharedKeys.has(key)) return false;
  try {
    const { error } = await getSupabaseClient().from(table).insert(toDatabaseRow(item as Record<string, unknown>));
    if (error) {
      logSupabaseMutation(table, "INSERT", item.id, error);
      onError?.(error.message);
    }
    return !error;
  } catch (error) {
    console.error(`[Crew On Set] INSERT FAILED`, { table: `public.${table}`, id: item.id, error });
    return false;
  }
}

export async function updateSharedRecord<T extends { id: string }>(key: string, item: T) {
  const table = sharedTables[key];
  if (!table || !sharedKeys.has(key)) return false;
  try {
    const { error } = await getSupabaseClient().from(table).update(toDatabaseRow(item as Record<string, unknown>)).eq("id", item.id);
    if (error) logSupabaseMutation(table, "UPDATE", item.id, error);
    return !error;
  } catch (error) {
    console.error(`[v0] Supabase UPDATE failed for ${table} ${item.id}:`, error);
    return false;
  }
}

export async function deleteSharedRecord(key: string, id: string) {
  const table = sharedTables[key];
  if (!table || !sharedKeys.has(key)) return false;
  console.info("[Crew On Set] BUG DELETE REQUEST", { table: `public.${table}`, id });
  try {
    const { data, error } = await getSupabaseClient().from(table).delete().eq("id", id).select("id");
    if (error) {
      logSupabaseMutation(table, "DELETE", id, error);
      return false;
    }
    console.info("[Crew On Set] BUG DELETE SUCCESS", { table: `public.${table}`, id, data });
    return await verifyDeletedRows(table, [id]);
  } catch (error) {
    console.error(`[Crew On Set] BUG DELETE FAILED`, { table: `public.${table}`, id, error });
    return false;
  }
}

export async function deleteSharedRecords(key: string, ids: string[]) {
  const table = sharedTables[key];
  if (!table || !sharedKeys.has(key) || ids.length === 0) return false;
  console.info("[Crew On Set] BUG BULK DELETE REQUEST", { table: `public.${table}`, ids, count: ids.length });
  try {
    const { data, error } = await getSupabaseClient().from(table).delete().in("id", ids).select("id");
    if (error) {
      logSupabaseError("DELETE", table, ids.join(","), error);
      return false;
    }
    console.info("[Crew On Set] BUG BULK DELETE SUCCESS", { table: `public.${table}`, ids, count: ids.length, data });
    return await verifyDeletedRows(table, ids);
  } catch (error) {
    console.error(`[Crew On Set] BUG BULK DELETE FAILED`, { table: `public.${table}`, ids, error });
    return false;
  }
}

async function loadSharedTable<T>(key: string) {
  const table = sharedTables[key];
  if (!table) return null;
  try {
    const { data, error } = await getSupabaseClient().from(table).select("*");
    if (error) {
      logSupabaseError("SELECT", table, undefined, error);
      return null;
    }
    return (data ?? [])
    .map((row) => fromDatabaseRow<T>(row as Record<string, unknown>))
      .sort((a, b) => timestampFor(key, b as Record<string, unknown>) - timestampFor(key, a as Record<string, unknown>));
  } catch (error) {
    console.error(`[v0] Supabase SELECT failed for ${table}:`, error);
    return null;
  }
}

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — shared data stays in Supabase */
  }
  window.dispatchEvent(new CustomEvent(`cos:${key}`));
}

function reconcileExpired<T>(key: string, items: T[], now = Date.now()) {
  if (key !== "cos.ads" && key !== "cos.applications") return items;
  let changed = false;
  const next = items.map((item) => {
    const record = item as T & { status?: string; expiresAt?: string; endedAt?: string };
    if (record.status !== "Done" && record.expiresAt && new Date(record.expiresAt).getTime() <= now) {
      changed = true;
      return { ...record, status: "Done", endedAt: record.endedAt ?? new Date(record.expiresAt).toISOString() } as T;
    }
    return item;
  });
  if (changed) write(key, next);
  return next;
}

/**
 * Hydration-safe demo collection. The server (and the first client render)
 * always sees `seed`; stored data is adopted in an effect.
 */
export function createStore<T>(key: string, seed: T[]) {
  const event = `cos:${key}`;

  function get() {
    const items = read<T[]>(key, seed);
    return items;
  }

  function set(next: T[] | ((current: T[]) => T[])) {
    const current = get();
    write(key, typeof next === "function" ? next(current) : next);
  }

  function useStore(): [T[], (next: T[] | ((current: T[]) => T[])) => void] {
    const [items, setItems] = useState<T[]>(seed);
    const localWriteRef = useRef(false);

    useEffect(() => {
      let active = true;
      setItems(reconcileExpired(key, get()));
      void loadSharedTable<T>(key).then((remoteItems) => {
        if (active && !localWriteRef.current && remoteItems) {
          const reconciled = reconcileExpired(key, remoteItems);
          write(key, reconciled);
          setItems(reconciled);
        }
      });
      const sync = () => setItems(get());
      window.addEventListener(event, sync);
      window.addEventListener("storage", sync);
      return () => {
        active = false;
        window.removeEventListener(event, sync);
        window.removeEventListener("storage", sync);
      };
    }, []);

    return [
      items,
      (next: T[] | ((current: T[]) => T[])) => {
        const resolved = typeof next === "function" ? next(get()) : next;
        localWriteRef.current = true;
        setItems(resolved);
        set(resolved);
      },
    ];
  }

  return { get, set, useStore };
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

/* ------------------------------------------------------------ notifications */

export type NotificationTargetKind = "all" | "players";

export type PlayerNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  kind: "announcement" | "achievement" | "friend" | "shop" | "system";
  read: boolean;
  /** In-app destination this notification links to when clicked. */
  href?: string;
  /** Targeting metadata, used by the admin announcement composer. */
  target?: {
    kind: NotificationTargetKind;
    playerIds?: string[] | undefined;
    group?: string | undefined;
  };
};

const seedNotifications: PlayerNotification[] = [
  {
    id: "ntf-1001",
    title: "Season 3 production slate is live",
    body: "New client shoots, two new sets and a fresh cosmetic drop are now available on set.",
    createdAt: "2026-08-27T09:12:00.000Z",
    kind: "announcement",
    read: false,
    href: "/portal/shop",
    target: { kind: "all" },
  },
  {
    id: "ntf-1002",
    title: "Achievement unlocked — One Take Wonder",
    body: "You wrapped a production without a single retake. +450 XP awarded.",
    createdAt: "2026-08-26T18:40:00.000Z",
    kind: "achievement",
    read: false,
    href: "/portal/achievements",
  },
  {
    id: "ntf-1003",
    title: "New friend request",
    body: "GAFFER_GEM wants to join your crew roster.",
    createdAt: "2026-08-25T14:05:00.000Z",
    kind: "friend",
    read: true,
    href: "/portal/friends",
  },
  {
    id: "ntf-1004",
    title: "C-Coin top-up confirmed",
    body: "1,200 C-Coins were added to your wallet. Receipt sent to your crew email.",
    createdAt: "2026-08-23T07:30:00.000Z",
    kind: "shop",
    read: true,
    href: "/portal/shop",
  },
  {
    id: "ntf-1005",
    title: "Scheduled maintenance",
    body: "Studio servers go down for 30 minutes on Sunday 02:00 UTC.",
    createdAt: "2026-08-21T11:00:00.000Z",
    kind: "system",
    read: true,
    href: "/portal",
    target: { kind: "all" },
  },
];

export const notificationsStore = createStore<PlayerNotification>(
  "cos.notifications",
  seedNotifications,
);

/* --------------------------------------------------- partnership applications */

export type PartnershipStatus = "Pending" | "Approved" | "On-going" | "Done" | "Declined";

export type PartnershipApplication = {
  id: string;
  brand: string;
  productType: string;
  exactModel: string;
  link: string;
  fileName: string;
  attachmentUrl?: string;
  attachmentType?: string;
  budget: number;
  duration: number;
  durationUnit: "Days" | "Months";
  email: string;
  description?: string;
  submittedAt: string;
  status: PartnershipStatus;
  archived?: boolean;
  archivedAt?: string;
};

const seedApplications: PartnershipApplication[] = [
  {
    id: "APP-4821",
    brand: "Northline Optics",
    productType: "Camera Gear",
    exactModel: "Northline NL-70 Cine Prime",
    link: "https://example.com/northline/nl-70",
    fileName: "northline-nl70-brandkit.pdf",
    budget: 48000,
    duration: 6,
    durationUnit: "Months",
    email: "partners@northlineoptics.example",
    submittedAt: "2026-08-24T10:22:00.000Z",
    status: "Pending",
  },
  {
    id: "APP-4818",
    brand: "Cafe Kalye",
    productType: "Food & Beverage",
    exactModel: "Kalye Cold Brew 500ml",
    link: "https://example.com/cafekalye/coldbrew",
    fileName: "kalye-coldbrew-assets.zip",
    budget: 12500,
    duration: 45,
    durationUnit: "Days",
    email: "marketing@cafekalye.example",
    submittedAt: "2026-08-19T03:48:00.000Z",
    status: "On-going",
  },
  {
    id: "APP-4802",
    brand: "Vantage Apparel",
    productType: "Apparel",
    exactModel: "Vantage Crew Jacket V2",
    link: "https://example.com/vantage/crew-jacket",
    fileName: "vantage-jacket-lookbook.pdf",
    budget: 26000,
    duration: 3,
    durationUnit: "Months",
    email: "brand@vantageapparel.example",
    submittedAt: "2026-08-11T22:15:00.000Z",
    status: "Approved",
  },
  {
    id: "APP-4790",
    brand: "Skyfare Airlines",
    productType: "Travel",
    exactModel: "Skyfare Domestic Promo",
    link: "https://example.com/skyfare/promo",
    fileName: "skyfare-promo-brief.pdf",
    budget: 65000,
    duration: 12,
    durationUnit: "Months",
    email: "adops@skyfare.example",
    submittedAt: "2026-07-30T08:05:00.000Z",
    status: "Done",
  },
  {
    id: "APP-4776",
    brand: "Bolt Energy",
    productType: "Food & Beverage",
    exactModel: "Bolt Zero 330ml",
    link: "https://example.com/bolt/zero",
    fileName: "bolt-zero-pack.zip",
    budget: 4200,
    duration: 20,
    durationUnit: "Days",
    email: "hello@boltenergy.example",
    submittedAt: "2026-07-18T16:41:00.000Z",
    status: "Declined",
  },
];

export const applicationsStore = createStore<PartnershipApplication>(
  "cos.applications",
  seedApplications,
);

/* ------------------------------------------------------------ active adverts */

export type ActiveAd = {
  id: string;
  /** Stable source application relationship; avoids fragile brand matching. */
  applicationId?: string;
  brand: string;
  exactModel: string;
  productType: string;
  contract: string;
  startDate: string;
  /** ISO timestamp the live countdown ticks down to. */
  expiresAt: string;
  status: "On-going" | "Expiring" | "Expired" | "Done";
  /** Set when an administrator finishes an advertisement early. */
  endedAt?: string;
  archived?: boolean;
  archivedAt?: string;
  revenue: number;
  clicks: number;
  visits: number;
  /** Ad displays / impressions served for this placement. */
  impressions: number;
  placement: string;
};

const seedAds: ActiveAd[] = [
  {
    id: "AD-3301",
    applicationId: "APP-4818",
    brand: "Cafe Kalye",
    exactModel: "Kalye Cold Brew 500ml",
    productType: "Food & Beverage",
    contract: "45-day set-dressing placement across Studio B craft services.",
    startDate: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-15T00:00:00.000Z",
    status: "On-going",
    revenue: 12500,
    clicks: 18420,
    visits: 96310,
    impressions: 412800,
    placement: "Studio B — craft table props",
  },
  {
    id: "AD-3288",
    applicationId: "APP-4802",
    brand: "Vantage Apparel",
    exactModel: "Vantage Crew Jacket V2",
    productType: "Apparel",
    contract: "3-month wardrobe integration for Cameraman and Gaffer outfits.",
    startDate: "2026-07-15T00:00:00.000Z",
    expiresAt: "2026-10-15T00:00:00.000Z",
    status: "On-going",
    revenue: 26000,
    clicks: 33110,
    visits: 148900,
    impressions: 689200,
    placement: "Wardrobe — crew outfit skins",
  },
  {
    id: "AD-3274",
    applicationId: "APP-4821",
    brand: "Northline Optics",
    exactModel: "Northline NL-70 Cine Prime",
    productType: "Camera Gear",
    contract: "In-game equipment rental billboard, camera department.",
    startDate: "2026-06-20T00:00:00.000Z",
    expiresAt: "2026-08-30T00:00:00.000Z",
    status: "Expiring",
    revenue: 48000,
    clicks: 51200,
    visits: 202450,
    impressions: 934100,
    placement: "Equipment truck — lens wall",
  },
  {
    id: "AD-3255",
    applicationId: "APP-4776",
    brand: "Bolt Energy",
    exactModel: "Bolt Zero 330ml",
    productType: "Food & Beverage",
    contract: "20-day vending machine placement in the backlot.",
    startDate: "2026-05-02T00:00:00.000Z",
    expiresAt: "2026-05-22T00:00:00.000Z",
    status: "Expired",
    revenue: 4200,
    clicks: 6110,
    visits: 28740,
    impressions: 124500,
    placement: "Backlot — vending machines",
  },
];

export const adsStore = createStore<ActiveAd>("cos.ads", seedAds);

export type RevenueRecord = ActiveAd & {
  applicationId: string;
};

export const revenueStore = createStore<RevenueRecord>(
  "cos.revenue",
  seedAds.map((ad) => ({ ...ad, applicationId: ad.applicationId ?? ad.id })),
);

/* ----------------------------------------------------------------- currency */

/** C-Coin wallet balance for the demo player. */
export const walletStore = createStore<number>("cos.wallet", [8450]);

export function formatCoins(value: number) {
  return value.toLocaleString("en-US");
}

export function formatMoney(value: number) {
  return `₱${value.toLocaleString("en-US")}`;
}

export async function readAttachmentAsDataUrl(file: File, folder = "submissions"): Promise<string> {
  const uploaded = await uploadAttachment(file, folder);
  return uploaded.url;
}

/* ------------------------------------------------- system requirements (admin) */

/**
 * Public Download page requirements, editable from Admin → Game & Announcements.
 * Demo-only: persisted in localStorage like the rest of this data layer.
 */
export type SystemRequirementRow = {
  id: string;
  label: string;
  minimum: string;
  recommended: string;
};

export const seedSystemRequirements: SystemRequirementRow[] = [
  { id: "req-os", label: "OS", minimum: "Windows 10 64-bit", recommended: "Windows 11 64-bit" },
  {
    id: "req-cpu",
    label: "Processor",
    minimum: "Intel Core i3-8100 / AMD Ryzen 3 2200G",
    recommended: "Intel Core i5-10400 / AMD Ryzen 5 3600",
  },
  { id: "req-ram", label: "Memory", minimum: "8 GB RAM", recommended: "16 GB RAM" },
  {
    id: "req-gpu",
    label: "Graphics",
    minimum: "GTX 960 / RX 570 (2 GB VRAM)",
    recommended: "GTX 1660 / RX 5600 XT (6 GB VRAM)",
  },
  { id: "req-dx", label: "DirectX", minimum: "Version 11", recommended: "Version 12" },
  {
    id: "req-storage",
    label: "Storage",
    minimum: "6 GB available space",
    recommended: "10 GB available space (SSD)",
  },
  {
    id: "req-net",
    label: "Network",
    minimum: "Broadband internet for co-op play",
    recommended: "Broadband internet for co-op play",
  },
];

export const systemRequirementsStore = createStore<SystemRequirementRow>(
  "cos.systemRequirements",
  seedSystemRequirements,
);

/** Build metadata shown next to the download button. */
export type BuildInfo = {
  version: string;
  builtOn: string;
  platform: string;
  installSize: string;
};

export const seedBuildInfo: BuildInfo = {
  version: "Version 0.9.4 (Playtest Build)",
  builtOn: "Built August 27, 2026",
  platform: "Windows 10/11 · 64-bit",
  installSize: "~~ GB install size",
};

export const buildInfoStore = createStore<BuildInfo>("cos.buildInfo", [seedBuildInfo]);

/* ------------------------------------------------------------- admin account */

export type AdminAccount = { name: string; email: string; password: string };

export const adminAccountStore = createStore<AdminAccount>("cos.adminAccount", [
  { name: "Administrator", email: "admin@crew-on-set.game", password: "admin" },
]);

/* ------------------------------------------------- admin alert read tracking */

/** IDs of admin alerts the administrator has already marked as read. */
export const alertReadStore = createStore<string>("cos.admin.alerts.read", []);

/* ------------------------------------------------------ player transactions */

/**
 * Private C-Coin ledger for the demo player, shown on the portal profile page.
 * Demo-only: persisted in localStorage like the rest of this data layer.
 */
export type PlayerTransactionKind = "purchase" | "topup" | "reward";

export type PlayerTransaction = {
  id: string;
  label: string;
  detail: string;
  amount: number; // negative = spent, positive = received
  kind: PlayerTransactionKind;
  createdAt: string;
};

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const seedTransactions: PlayerTransaction[] = [
  {
    id: "tx-seed-1",
    label: "Director's Trench Coat",
    detail: "Shop purchase — Outfits",
    amount: -1800,
    kind: "purchase",
    createdAt: daysAgo(2),
  },
  {
    id: "tx-seed-2",
    label: "C-Coin Top-Up",
    detail: "Studio Bundle — 5,000 C-Coins",
    amount: 5000,
    kind: "topup",
    createdAt: daysAgo(6),
  },
  {
    id: "tx-seed-3",
    label: "Perfect Take Bonus",
    detail: "Weekly production reward",
    amount: 750,
    kind: "reward",
    createdAt: daysAgo(11),
  },
];

export const transactionsStore = createStore<PlayerTransaction>(
  "cos.transactions",
  seedTransactions,
);

export function formatTransactionDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* --------------------------------------------------------- social links (admin) */

/**
 * Website social links, managed from Admin → Settings and consumed by the
 * public site footer. The footer must read from this store — never hardcode.
 */
export type SocialLink = {
  id: string;
  platform: string;
  url: string;
  active: boolean;
};

export const socialLinksStore = createStore<SocialLink>("cos.socialLinks", [
  { id: "soc-youtube", platform: "YouTube", url: "https://www.youtube.com/", active: true },
  { id: "soc-instagram", platform: "Instagram", url: "https://www.instagram.com/", active: true },
  { id: "soc-twitter", platform: "Twitter", url: "https://twitter.com/", active: true },
  { id: "soc-facebook", platform: "Facebook", url: "https://www.facebook.com/", active: true },
]);

/* ------------------------------------------- installation steps (admin → public) */

/** Public Download page installation instructions. Maximum of 4 steps. */
export type InstallStep = { id: string; title: string; text: string };

export const MAX_INSTALL_STEPS = 4;

export const installStepsStore = createStore<InstallStep>("cos.installSteps", [
  {
    id: "step-1",
    title: "Download the installer",
    text: 'Click "Download the Game" above to get the latest CrewOnSet-Setup package.',
  },
  {
    id: "step-2",
    title: "Run the installer",
    text: "Open the downloaded file and follow the on-screen setup wizard.",
  },
  {
    id: "step-3",
    title: "Choose an install location",
    text: "Pick a drive with enough free space, ideally an SSD for faster load times.",
  },
  {
    id: "step-4",
    title: "Launch and sign in",
    text: "Start the game, sign in with your Crew On Set! account, and play with your crew.",
  },
]);

/* ------------------------------------------------------------- game build */

/** Current game build, updated from Admin → Game → Upload Update. */
export type GameBuild = {
  version: string;
  buildNumber: string;
  minWindows: string;
  installerFileName: string;
  downloadUrl: string;
  releaseNotes: string;
  releasedAt: string;
};

export const gameBuildStore = createStore<GameBuild>("cos.gameBuild", [
  {
    version: "0.9.4",
    buildNumber: "940",
    minWindows: "Windows 10 64-bit",
    installerFileName: "CrewOnSet-0.9.4-playtest.exe",
    downloadUrl: "https://drive.google.com/",
    releaseNotes:
      "New client shoots in Studio B, rebalanced lighting scoring, and fixes for co-op lobby desyncs.",
    releasedAt: "2026-08-27T00:00:00.000Z",
  },
]);

/** Archive of previously uploaded builds, newest first. */
export const buildHistoryStore = createStore<GameBuild>("cos.buildHistory", []);

/* ------------------------------------------------------------- bug reports */

export type BugStatus = "New" | "Investigating" | "Resolved";

export type BugReport = {
  id: string;
  playerName: string;
  playerId: string;
  category: string;
  description: string;
  submittedAt: string;
  /** Contact email supplied by the reporting player. */
  email?: string;
  /** File name of an optional image/PDF attachment. */
  attachmentName?: string;
  /** Existing URL/data for the optional attachment, when available. */
  attachmentUrl?: string;
  /** MIME type captured with the attachment for reliable previews. */
  attachmentType?: string;
  /** Admin-only triage state. Never shown in the player portal. */
  status: BugStatus;
};

export const bugCategories = [
  "Gameplay",
  "Graphics / Visual",
  "Audio",
  "Performance / Crash",
  "Account & Login",
  "Shop & C-Coins",
  "UI / Navigation",
  "Other",
];

export const bugReportsStore = createStore<BugReport>("cos.bugReports", [
  {
    id: "BUG-2041",
    playerName: "FramePerfect",
    playerId: "COS-0001",
    category: "Performance / Crash",
    description:
      "Game hard-crashes when four players enter Studio B at the same time during the night shoot intro.",
    submittedAt: "2026-08-28T09:14:00.000Z",
    status: "New",
  },
  {
    id: "BUG-2038",
    playerName: "BoomBuddy",
    playerId: "COS-0002",
    category: "Audio",
    description: "Boom mic audio keeps clipping even when the meter stays in the green range.",
    submittedAt: "2026-08-26T15:02:00.000Z",
    status: "Investigating",
  },
  {
    id: "BUG-2030",
    playerName: "LightLeak",
    playerId: "COS-0003",
    category: "Graphics / Visual",
    description: "Softbox diffusion renders as a black square on low graphics settings.",
    submittedAt: "2026-08-22T11:40:00.000Z",
    status: "Resolved",
  },
]);

/* ---------------------------------------------------------- player reports */

export type PlayerReportStatus = "New" | "Investigating" | "Resolved";

export type PlayerReport = {
  id: string;
  reporterName: string;
  reporterId: string;
  reportType: string;
  description: string;
  submittedAt: string;
  /** Username of the player being reported. */
  reportedUsername: string;
  /** File name of an optional image/PDF attachment. */
  attachmentName?: string;
  /** Existing URL/data for the optional attachment, when available. */
  attachmentUrl?: string;
  /** MIME type captured with the attachment for reliable previews. */
  attachmentType?: string;
  /** Admin-only triage state. Never shown in the player portal. */
  status: PlayerReportStatus;
};

export const playerReportTypes = ["Trolling", "Negative Attitude", "Verbal Abuse", "Other"];

export const playerReportsStore = createStore<PlayerReport>("cos.playerReports", []);

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  kind: "player-report" | "application" | "system";
  href: string;
  entityId?: string;
  entityType?: string;
  read: boolean;
  createdAt: string;
};

export const adminNotificationsStore = createStore<AdminNotification>(
  "cos.adminNotifications",
  [],
);

/* --------------------------------------------------------- equipped loadout */

export type LoadoutSlot = "Head" | "Hair" | "Shirt" | "Accessory" | "Shoes";

export const loadoutSlots: LoadoutSlot[] = ["Head", "Hair", "Shirt", "Accessory", "Shoes"];

export type LoadoutPiece = {
  slot: LoadoutSlot;
  itemName: string | null;
  image?: string | undefined;
  initials?: string | undefined;
  gradient?: string | undefined;
};

export const loadoutStore = createStore<LoadoutPiece>("cos.loadout", [
  { slot: "Head", itemName: "Crew Cap", initials: "CC", gradient: "from-slate-400 to-slate-600" },
  { slot: "Hair", itemName: "Buzz Cut", initials: "BZ", gradient: "from-amber-400 to-orange-600" },
  {
    slot: "Shirt",
    itemName: "PA Windbreaker",
    initials: "PA",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    slot: "Accessory",
    itemName: "Boom Headphones",
    initials: "BH",
    gradient: "from-emerald-400 to-teal-600",
  },
  { slot: "Shoes", itemName: null },
]);

/* ------------------------------------------------------ admin activity log */

export type AdminActivityKind =
  "player" | "news" | "gallery" | "game" | "announcement" | "almanac" | "bug";

export type AdminActivity = {
  id: string;
  kind: AdminActivityKind;
  label: string;
  detail: string;
  createdAt: string;
};

export const adminActivityStore = createStore<AdminActivity>("cos.admin.activity", [
  {
    id: "aa-1",
    kind: "player",
    label: "Player status changed",
    detail: "FinalTake was banned until Sep 12, 2026.",
    createdAt: "2026-08-30T14:20:00.000Z",
  },
  {
    id: "aa-2",
    kind: "game",
    label: "Game build uploaded",
    detail: "Version 0.9.4 (build 940) is now live.",
    createdAt: "2026-08-27T08:05:00.000Z",
  },
  {
    id: "aa-3",
    kind: "announcement",
    label: "Announcement sent",
    detail: "Season 3 production slate is live — all players.",
    createdAt: "2026-08-27T09:12:00.000Z",
  },
  {
    id: "aa-4",
    kind: "player",
    label: "Player progress reset",
    detail: "CutToChaos progression was reset on request.",
    createdAt: "2026-08-25T17:44:00.000Z",
  },
  {
    id: "aa-5",
    kind: "gallery",
    label: "Gallery updated",
    detail: "Added 6 new set-photography stills.",
    createdAt: "2026-08-24T10:30:00.000Z",
  },
  {
    id: "aa-6",
    kind: "news",
    label: "News article published",
    detail: '"Inside the Studio B rebuild" went live.',
    createdAt: "2026-08-21T12:00:00.000Z",
  },
]);

/** Record a new admin action (newest first, capped for the demo). */
export function logAdminActivity(entry: Omit<AdminActivity, "id" | "createdAt">) {
  const next: AdminActivity = {
    ...entry,
    id: uid("aa"),
    createdAt: new Date().toISOString(),
  };
  adminActivityStore.set([next, ...adminActivityStore.get()].slice(0, 40));
}

/* -------------------------------------------------------------- admin inbox */

export type MessageStatus = "Unread" | "In Progress" | "Resolved";

export type AdminMessage = {
  id: string;
  subject: string;
  sender: string;
  email: string;
  body: string;
  createdAt: string;
  status: MessageStatus;
};

export const messagesStore = createStore<AdminMessage>("cos.admin.messages", [
  {
    id: "MSG-771",
    subject: "Partnership follow-up — Northline Optics",
    sender: "Dana Cruz",
    email: "partners@northlineoptics.example",
    body: "Following up on our lens-wall placement proposal for the next slate.",
    createdAt: "2026-08-30T09:15:00.000Z",
    status: "Unread",
  },
  {
    id: "MSG-770",
    subject: "Press kit request",
    sender: "Miguel Tan",
    email: "miguel@filmbeat.example",
    body: "Could we get the high-resolution key art for a feature piece?",
    createdAt: "2026-08-29T13:48:00.000Z",
    status: "Unread",
  },
  {
    id: "MSG-769",
    subject: "Co-op lobby keeps dropping",
    sender: "SlateRunner",
    email: "slate@example.com",
    body: "Our four-player lobby disconnects around the second take every session.",
    createdAt: "2026-08-28T20:02:00.000Z",
    status: "In Progress",
  },
  {
    id: "MSG-767",
    subject: "Localization volunteer",
    sender: "Ana Reyes",
    email: "ana@example.com",
    body: "Happy to help with Filipino localization for the playtest build.",
    createdAt: "2026-08-26T07:31:00.000Z",
    status: "Resolved",
  },
  {
    id: "MSG-765",
    subject: "Refund on duplicate top-up",
    sender: "ColorGrade",
    email: "color@example.com",
    body: "I was charged twice for the 2,600 C-Coin bundle.",
    createdAt: "2026-08-24T18:19:00.000Z",
    status: "Resolved",
  },
]);

/* ---------------------------------------------------------- content library */

/** Editorial content counters surfaced on the admin dashboard. */
export type ContentStats = {
  publishedNews: number;
  draftNews: number;
  galleryItems: number;
  faqEntries: number;
};

export const contentStatsStore = createStore<ContentStats>("cos.admin.contentStats", [
  { publishedNews: 14, draftNews: 3, galleryItems: 42, faqEntries: 18 },
]);
