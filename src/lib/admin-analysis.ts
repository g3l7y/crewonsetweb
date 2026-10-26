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
    return "A prior-month baseline is not available yet for " + label + ".";
  }

  const delta = current - previous;
  if (delta === 0) {
    return label + " held steady compared with the previous month.";
  }

  const movement = label === "sales"
    ? delta > 0 ? "rose" : "fell"
    : delta > 0 ? "grew" : "declined";
  return label + " " + movement + " by " + formatter(Math.abs(delta)) + " compared with the previous month.";
}

export function buildOverallAnalysis(snapshot: AdminAnalysisSnapshot) {
  const playerStatus = snapshot.players.total === 0
    ? "The roster is ready for its first player account."
    : formatNumber(snapshot.players.total) + " player accounts are on record, with "
      + formatNumber(snapshot.players.active) + " active and "
      + formatNumber(snapshot.players.banned) + " banned accounts.";

  const playerMovement = describeMovement(
    "player count",
    snapshot.players.currentMonthTotal,
    snapshot.players.previousMonthTotal,
    formatNumber,
  );

  const revenueStatus = "Tracked sales and partnerships total " + formatAnalysisPhp(snapshot.revenue.total)
    + ", including " + formatAnalysisPhp(snapshot.revenue.paymongo)
    + " across " + formatNumber(snapshot.revenue.transactionCount)
    + " sales ledger entries, plus " + formatAnalysisPhp(snapshot.revenue.brandBudgets)
    + " in recognized brand budgets.";

  const salesMovement = describeMovement(
    "sales",
    snapshot.revenue.currentMonth,
    snapshot.revenue.previousMonth,
    formatAnalysisPhp,
  );

  return [
    "Here is the studio snapshot for " + formatDate(snapshot.asOf) + ". " + playerStatus,
    "For the roster, " + playerMovement + " Every new account adds another voice to the community, while the active and banned totals help keep the bigger picture in view.",
    revenueStatus + " For sales, " + salesMovement + " The ledger provides a clear running record of completed sales, and recognized brand budgets show the value of current partnership activity.",
    "Taken together, these numbers give the team a practical read on growth and commercial momentum. Check the trend lines for changes over time, celebrate what is moving in the right direction, and use quieter periods to spot where a fresh idea or campaign could help the studio pick up speed.",
  ].join(" ");
}
