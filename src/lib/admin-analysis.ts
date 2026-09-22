export type AnalysisTrendPoint = {
  date: string;
  value: number;
};

export type AdminAnalysisSnapshot = {
  asOf: string;
  players: {
    total: number;
    active: number;
    banned: number;
    currentMonthTotal: number | null;
    previousMonthTotal: number | null;
    trend: AnalysisTrendPoint[];
  };
  revenue: {
    paymongo: number;
    brandBudgets: number;
    total: number;
    transactionCount: number;
    currentMonth: number | null;
    previousMonth: number | null;
    trend: AnalysisTrendPoint[];
  };
};

export type OverallAnalysisSource = "ai" | "live-data";

export type OverallAnalysisResponse = {
  analysis: string;
  generatedAt: string;
  source: OverallAnalysisSource;
};

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-US");
}

export function formatAnalysisPhp(value: number) {
  return phpFormatter.format(Number(value || 0));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function describeMovement(
  label: string,
  current: number | null,
  previous: number | null,
  formatter: (value: number) => string,
) {
  if (current === null || previous === null) {
    return "There is no prior-month baseline for " + label + ".";
  }

  const delta = current - previous;
  if (delta === 0) {
    return label + " is unchanged from the previous month.";
  }

  const direction = delta > 0 ? "up" : "down";
  return label + " is " + direction + " by " + formatter(Math.abs(delta)) + " versus the previous month.";
}

export function buildOverallAnalysis(snapshot: AdminAnalysisSnapshot) {
  const playerStatus = snapshot.players.total === 0
    ? "No player accounts are currently present."
    : formatNumber(snapshot.players.total) + " player accounts are on record, including "
      + formatNumber(snapshot.players.active) + " active and "
      + formatNumber(snapshot.players.banned) + " banned accounts.";

  const playerMovement = describeMovement(
    "player count",
    snapshot.players.currentMonthTotal,
    snapshot.players.previousMonthTotal,
    formatNumber,
  );

  const revenueStatus = "Tracked revenue is " + formatAnalysisPhp(snapshot.revenue.total)
    + ", made up of " + formatAnalysisPhp(snapshot.revenue.paymongo)
    + " across " + formatNumber(snapshot.revenue.transactionCount)
    + " PayMongo ledger entries and " + formatAnalysisPhp(snapshot.revenue.brandBudgets)
    + " in recognized brand budgets.";

  const salesMovement = describeMovement(
    "monthly PayMongo sales",
    snapshot.revenue.currentMonth,
    snapshot.revenue.previousMonth,
    formatAnalysisPhp,
  );

  return [
    "As of " + formatDate(snapshot.asOf) + ", " + playerStatus + " " + playerMovement,
    revenueStatus + " " + salesMovement,
  ].join(" ");
}