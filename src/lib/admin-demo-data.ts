export const players = [
  { id: 1, username: "FramePerfect", email: "frame@example.com", status: "Active", joined: "Aug 02, 2026", score: 9840 },
  { id: 2, username: "BoomBuddy", email: "boom@example.com", status: "Active", joined: "Jul 28, 2026", score: 9310 },
  { id: 3, username: "LightLeak", email: "lights@example.com", status: "Inactive", joined: "Jul 21, 2026", score: 8870 },
  { id: 4, username: "DollyDash", email: "dolly@example.com", status: "Active", joined: "Jul 18, 2026", score: 8420 },
  { id: 5, username: "FinalTake", email: "take@example.com", status: "Banned", joined: "Jul 11, 2026", score: 7960 },
  { id: 6, username: "PropMaster", email: "props@example.com", status: "Active", joined: "Jul 05, 2026", score: 7550 },
  { id: 7, username: "CutToChaos", email: "cut@example.com", status: "Inactive", joined: "Jun 29, 2026", score: 7140 },
  { id: 8, username: "SlateRunner", email: "slate@example.com", status: "Active", joined: "Jun 22, 2026", score: 6810 },
  { id: 9, username: "ColorGrade", email: "color@example.com", status: "Active", joined: "Jun 14, 2026", score: 6240 },
  { id: 10, username: "WideAngle", email: "wide@example.com", status: "Inactive", joined: "Jun 08, 2026", score: 5890 },
  { id: 11, username: "SoundSpeed", email: "sound@example.com", status: "Active", joined: "May 31, 2026", score: 5420 },
  { id: 12, username: "CraftTable", email: "craft@example.com", status: "Active", joined: "May 24, 2026", score: 4980 },
] as const;

export const transactions = [
  { id: "TX-10482", player: "FramePerfect", playerId: "#0001", type: "C-Coin Purchase", item: "1,000 C-Coins", amount: "₱9.99", status: "Completed", date: "Aug 09, 2026" },
  { id: "TX-10481", player: "BoomBuddy", playerId: "#0002", type: "Store Purchase", item: "Director Jacket", amount: "₱6.50", status: "Completed", date: "Aug 09, 2026" },
  { id: "TX-10480", player: "LightLeak", playerId: "#0003", type: "C-Coin Purchase", item: "500 C-Coins", amount: "₱4.99", status: "Pending", date: "Aug 08, 2026" },
  { id: "TX-10479", player: "DollyDash", playerId: "#0004", type: "Store Purchase", item: "Golden Slate", amount: "₱8.00", status: "Completed", date: "Aug 08, 2026" },
  { id: "TX-10478", player: "FinalTake", playerId: "#0005", type: "C-Coin Purchase", item: "2,500 C-Coins", amount: "₱19.99", status: "Failed", date: "Aug 07, 2026" },
  { id: "TX-10477", player: "PropMaster", playerId: "#0006", type: "Store Purchase", item: "Prop Pack 02", amount: "₱5.25", status: "Completed", date: "Aug 07, 2026" },
  { id: "TX-10476", player: "SlateRunner", playerId: "#0008", type: "C-Coin Purchase", item: "1,000 C-Coins", amount: "₱9.99", status: "Pending", date: "Aug 06, 2026" },
  { id: "TX-10475", player: "ColorGrade", playerId: "#0009", type: "Store Purchase", item: "Neon Light Kit", amount: "₱7.75", status: "Failed", date: "Aug 06, 2026" },
] as const;

export const releases = [
  { version: "v0.9.4", date: "Aug 08, 2026", downloads: "18,240", status: "Live" },
  { version: "v0.9.3", date: "Jul 19, 2026", downloads: "14,870", status: "Archived" },
  { version: "v0.9.2", date: "Jun 30, 2026", downloads: "11,420", status: "Archived" },
  { version: "v0.9.1", date: "Jun 04, 2026", downloads: "8,965", status: "Archived" },
] as const;

export const admins = [
  { id: 1, name: "Studio Admin", email: "admin@crew-on-set.game", password: "admin", status: "Active" },
  { id: 2, name: "Production Lead", email: "production@crew-on-set.game", password: "Production26!", status: "Active" },
  { id: 3, name: "Support Manager", email: "support@crew-on-set.game", password: "Support26!", status: "Inactive" },
];

export const playerChartData = [

  { date: "Mar", players: 620 }, { date: "Apr", players: 980 }, { date: "May", players: 1540 },
  { date: "Jun", players: 2380 }, { date: "Jul", players: 3150 }, { date: "Aug", players: 4280 },
];

export const salesChartData = [
  { date: "Mar", sales: 4200 }, { date: "Apr", sales: 6800 }, { date: "May", sales: 5900 },
  { date: "Jun", sales: 9700 }, { date: "Jul", sales: 12800 }, { date: "Aug", sales: 16400 },
];

export const topUps = [
  { id: "TOP-88031", playerName: "FramePerfect", playerId: "COS-0001", date: "2026-08-09", time: "14:32", bank: "BDO •••• 4471", amount: 9.99, status: "Completed" },
  { id: "TOP-88030", playerName: "BoomBuddy", playerId: "COS-0002", date: "2026-08-09", time: "11:05", bank: "BPI •••• 2290", amount: 24.99, status: "Completed" },
  { id: "TOP-88029", playerName: "LightLeak", playerId: "COS-0003", date: "2026-08-08", time: "20:47", bank: "GCash •••• 8814", amount: 4.99, status: "Pending" },
  { id: "TOP-88028", playerName: "DollyDash", playerId: "COS-0004", date: "2026-08-08", time: "09:18", bank: "UnionBank •••• 3305", amount: 49.99, status: "Completed" },
  { id: "TOP-88027", playerName: "FinalTake", playerId: "COS-0005", date: "2026-08-07", time: "17:52", bank: "BDO •••• 7702", amount: 19.99, status: "Failed" },
  { id: "TOP-88026", playerName: "PropMaster", playerId: "COS-0006", date: "2026-08-07", time: "13:11", bank: "Metrobank •••• 5560", amount: 9.99, status: "Completed" },
  { id: "TOP-88025", playerName: "CutToChaos", playerId: "COS-0007", date: "2026-08-06", time: "22:03", bank: "GCash •••• 1129", amount: 4.99, status: "Completed" },
  { id: "TOP-88024", playerName: "SlateRunner", playerId: "COS-0008", date: "2026-08-06", time: "08:44", bank: "BPI •••• 9012", amount: 9.99, status: "Pending" },
  { id: "TOP-88023", playerName: "ColorGrade", playerId: "COS-0009", date: "2026-08-05", time: "19:29", bank: "UnionBank •••• 6644", amount: 24.99, status: "Failed" },
  { id: "TOP-88022", playerName: "WideAngle", playerId: "COS-0010", date: "2026-08-05", time: "10:15", bank: "BDO •••• 3391", amount: 49.99, status: "Completed" },
  { id: "TOP-88021", playerName: "SoundSpeed", playerId: "COS-0011", date: "2026-08-04", time: "16:38", bank: "GCash •••• 5502", amount: 9.99, status: "Completed" },
  { id: "TOP-88020", playerName: "CraftTable", playerId: "COS-0012", date: "2026-08-04", time: "07:59", bank: "Metrobank •••• 8873", amount: 4.99, status: "Completed" },
  { id: "TOP-88019", playerName: "FramePerfect", playerId: "COS-0001", date: "2026-07-30", time: "12:21", bank: "BDO •••• 4471", amount: 24.99, status: "Completed" },
  { id: "TOP-88018", playerName: "BoomBuddy", playerId: "COS-0002", date: "2026-07-27", time: "15:47", bank: "BPI •••• 2290", amount: 9.99, status: "Completed" },
  { id: "TOP-88017", playerName: "LightLeak", playerId: "COS-0003", date: "2026-07-22", time: "18:03", bank: "GCash •••• 8814", amount: 4.99, status: "Completed" },
] as const;

/* -------------------------------------------------- player detail mock data */

export type PlayerActivityEntry = {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
};

export type PlayerAccountInfo = {
  crewId: string;
  platform: string;
  device: string;
  lastLogin: string;
  lastIp: string;
  loginMethod: string;
  twoFactor: "Enabled" | "Disabled";
};

function seededPick<T>(list: readonly T[], seed: number) {
  const item = list[seed % list.length];
  return item as T;
}

export function getPlayerAccountInfo(id: number): PlayerAccountInfo {
  const devices = ["Desktop — RTX 3060", "Laptop — Intel i7", "Desktop — RX 6700 XT"];

  return {
    crewId: `COS-${String(id).padStart(4, "0")}`,
    platform: "Windows",
    device: seededPick(devices, id),
    lastLogin: "Aug 09, 2026 — 21:14",
    lastIp: `203.0.113.${(id * 7) % 255}`,
    loginMethod: "Google",
    twoFactor: id % 3 === 0 ? "Enabled" : "Disabled",
  };
}

export function getPlayerActivity(id: number, username: string): PlayerActivityEntry[] {
  return [
    {
      id: `act-${id}-1`,
      label: "Completed production",
      detail: `Wrapped "Studio B — Night Shoot" with a 94% crew rating.`,
      timestamp: "Aug 09, 2026 — 20:52",
    },
    {
      id: `act-${id}-2`,
      label: "Store purchase",
      detail: `${username} purchased a cosmetic item from the crew shop.`,
      timestamp: "Aug 08, 2026 — 16:10",
    },
    {
      id: `act-${id}-3`,
      label: "Joined production",
      detail: `Joined a Director-hosted session as Cameraman.`,
      timestamp: "Aug 07, 2026 — 12:35",
    },
    {
      id: `act-${id}-4`,
      label: "Achievement unlocked",
      detail: `Earned "One Take Wonder" (+450 XP).`,
      timestamp: "Aug 05, 2026 — 09:02",
    },
  ];
}

export type PlayerProductionStats = {
  productionsCompleted: number;
  averageRating: number;
  onTimeWrapRate: number;
  favoriteRole: string;
  bestSet: string;
};

export function getPlayerProductionStats(score: number): PlayerProductionStats {
  return {
    productionsCompleted: Math.max(1, Math.floor(score / 35)),
    averageRating: Math.min(5, Number((3.4 + (score % 100) / 160).toFixed(1))),
    onTimeWrapRate: Math.min(99, 60 + (score % 40)),
    favoriteRole: seededPick(["Cameraman", "Director", "Editor", "AV Technician"], score),
    bestSet: seededPick(["Studio A — Talk Show Set", "Studio B — Night Shoot", "Backlot — Action Sequence"], score),
  };
}

export function getPlayerTransactions(username: string) {
  return [
    ...transactions.filter((t) => t.player === username),
    ...topUps
      .filter((t) => t.playerName === username)
      .map((t) => ({
        id: t.id,
        player: t.playerName,
        playerId: t.playerId,
        type: "C-Coin Top-Up",
        item: `${t.bank}`,
        amount: `$${t.amount.toFixed(2)}`,
        status: t.status,
        date: t.date,
      })),
  ];
}
