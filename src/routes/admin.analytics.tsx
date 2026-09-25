import { createFileRoute } from "@tanstack/react-router";

import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { useSearchParams } from "@/components/next-compat/navigation";
import { playerChartData, salesChartData, players as mockPlayers, topUpsStore } from "@/lib/admin-demo-data";
import { buildOverallAnalysis, type AnalysisTrendPoint, type AdminAnalysisSnapshot } from "@/lib/admin-analysis";
import { applicationsStore, formatMoney } from "@/lib/demo/store";
import { useAdminPayMongoOrders } from "@/lib/admin-paymongo-orders";
import { isMockMode } from "@/lib/playfab/config";
import { useAdminPlayers } from "@/lib/playfab/hooks";
import {
  Activity,
  CircleDollarSign,
  Download,
  ServerCog,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Crew On Set! Admin" },
      {
        name: "description",
        content: "Review player growth, sales trends, and overall studio analysis.",
      },
      { property: "og:title", content: "Analytics — Crew On Set! Admin" },
      {
        property: "og:description",
        content: "Review player growth, sales trends, and overall studio analysis.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const recognizedPartnershipStatuses = new Set(["Approved", "On-going", "Done"]);
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mockChartYear = 2026;

function createMonthDate(year: number, month: number) {
  return [String(year), String(month + 1).padStart(2, "0"), "01T00:00:00.000Z"].join("-");
}

function summarizeTrend(values: Map<number, number>, year: number, cumulative: boolean) {
  let running = 0;
  const trend: AnalysisTrendPoint[] = monthLabels.map((_, month) => {
    const value = values.get(month) ?? 0;
    const plottedValue = cumulative ? (running += value) : value;
    return { date: createMonthDate(year, month), value: plottedValue };
  });
  const latestMonth = values.size > 0 ? Math.max(...values.keys()) : -1;

  return {
    trend,
    current: latestMonth >= 0 ? trend[latestMonth]?.value ?? null : null,
    previous: latestMonth > 0 ? trend[latestMonth - 1]?.value ?? null : null,
  };
}

function getPlayerTrend(
  mockMode: boolean,
  players: Array<{ joinedAt: string }> | undefined,
) {
  if (mockMode) {
    const values = new Map(
      playerChartData.map((point) => [monthLabels.indexOf(point.date), point.players]),
    );
    return summarizeTrend(values, mockChartYear, false);
  }

  const dates = (players ?? [])
    .map((player) => new Date(player.joinedAt))
    .filter((date) => !Number.isNaN(date.getTime()));
  const year = dates.length > 0
    ? Math.max(...dates.map((date) => date.getUTCFullYear()))
    : new Date().getUTCFullYear();
  const values = new Map<number, number>();

  for (const date of dates) {
    if (date.getUTCFullYear() !== year) continue;
    const month = date.getUTCMonth();
    values.set(month, (values.get(month) ?? 0) + 1);
  }

  return summarizeTrend(values, year, true);
}

function getSalesTrend(mockMode: boolean, topUps: Array<{ date: string; amount: number; status: string }>) {
  const values = new Map<number, number>();

  if (mockMode) {
    for (const point of salesChartData) {
      const month = monthLabels.indexOf(point.date);
      if (month >= 0) values.set(month, (values.get(month) ?? 0) + point.sales);
    }
  }

  const salesDates = topUps
    .map((topUp) => new Date(topUp.date))
    .filter((date) => !Number.isNaN(date.getTime()));
  const year = mockMode
    ? mockChartYear
    : salesDates.length > 0
      ? Math.max(...salesDates.map((date) => date.getUTCFullYear()))
      : new Date().getUTCFullYear();

  for (const topUp of topUps) {
    if (topUp.status !== "Completed") continue;
    const date = new Date(topUp.date);
    const amount = Number(topUp.amount);
    if (Number.isNaN(date.getTime()) || !Number.isFinite(amount)) continue;
    if (date.getUTCFullYear() !== year) continue;
    const month = date.getUTCMonth();
    values.set(month, (values.get(month) ?? 0) + amount);
  }

  return summarizeTrend(values, year, false);
}

function AnalyticsPage() {
  const mockMode = isMockMode();
  const adminPlayersQuery = useAdminPlayers();
  const [applications] = applicationsStore.useStore();
  const [demoTopUps] = topUpsStore.useStore();
  const liveTopUpsQuery = useAdminPayMongoOrders();
  const topUps = useMemo(
    () => (mockMode ? demoTopUps : (liveTopUpsQuery.data ?? [])),
    [demoTopUps, liveTopUpsQuery.data, mockMode],
  );
  const searchParams = useSearchParams();
  const selectedChart = searchParams.get("chart") === "sales" ? "sales" : "players";

  const revenue = useMemo(() => {
    const paymongoRevenue = topUps
      .filter((topUp) => topUp.status === "Completed")
      .reduce((total, topUp) => total + topUp.amount, 0);
    const recognizedBrandBudgets = applications
      .filter((application) => recognizedPartnershipStatuses.has(application.status) && application.paymentStatus !== "Paid")
      .reduce((total, application) => total + application.budget, 0);

    return {
      paymongoRevenue,
      recognizedBrandBudgets,
      total: paymongoRevenue + recognizedBrandBudgets,
    };
  }, [applications, topUps]);

  const playerTrend = useMemo(
    () => getPlayerTrend(mockMode, adminPlayersQuery.data),
    [adminPlayersQuery.data, mockMode],
  );
  const salesTrend = useMemo(() => getSalesTrend(mockMode, topUps), [mockMode, topUps]);
  const analysisSnapshot = useMemo<AdminAnalysisSnapshot>(() => {
    const realPlayers = adminPlayersQuery.data ?? [];
    const total = mockMode ? mockPlayers.length : realPlayers.length;
    const banned = mockMode
      ? mockPlayers.filter((player) => player.status === "Banned").length
      : realPlayers.filter((player) => player.adminStatus === "Banned").length;

    return {
      asOf: new Date().toISOString(),
      players: {
        total,
        active: total - banned,
        banned,
        currentMonthTotal: playerTrend.current,
        previousMonthTotal: playerTrend.previous,
        trend: playerTrend.trend,
      },
      revenue: {
        paymongo: revenue.paymongoRevenue,
        brandBudgets: revenue.recognizedBrandBudgets,
        total: revenue.total,
        transactionCount: topUps.filter((topUp) => topUp.status === "Completed").length,
        currentMonth: salesTrend.current,
        previousMonth: salesTrend.previous,
        trend: salesTrend.trend,
      },
    };
  }, [adminPlayersQuery.data, mockMode, playerTrend, revenue, salesTrend, topUps]);
  const overallAnalysis = useMemo(
    () => buildOverallAnalysis(analysisSnapshot),
    [analysisSnapshot],
  );

  const playerCount = adminPlayersQuery.isLoading ? "…" : String(analysisSnapshot.players.total);
  const overview = [
    {
      label: "Total Users",
      value: mockMode ? "24,892" : playerCount,
      context: mockMode ? "Registered accounts" : "Players returned by PlayFab",
      icon: Users,
      color: "bg-coral",
    },
    {
      label: "Active Players",
      value: mockMode ? "8,461" : String(analysisSnapshot.players.active),
      context: mockMode ? "Players currently active" : "Players in the real player feed",
      icon: UserCheck,
      color: "bg-[#2d9d8f]",
    },
    {
      label: "Total Downloads",
      value: mockMode ? "68,320" : "—",
      context: mockMode ? "Across all game releases" : "No real download counter is configured",
      icon: Download,
      color: "bg-[#d9a514]",
    },
    {
      label: "Total Revenue",
      value: formatMoney(revenue.total),
      context: "PayMongo ledger + recognized brand budgets",
      icon: CircleDollarSign,
      color: "bg-[#243241]",
    },
    {
      label: "Server Status",
      value: mockMode ? "Operational" : "Unknown",
      context: mockMode ? "99.98% uptime" : "Server monitoring is not configured",
      icon: ServerCog,
      color: "bg-[#2d9d8f]",
    },
  ];

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <header className="mb-8">
        <h1 className="admin-heading !text-white">Analytics</h1>
        <p className="admin-kicker !text-white/45">
          Track player growth, sales performance, and the revenue behind studio operations.
        </p>
      </header>

      <section aria-labelledby="analytics-overview-title">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="size-4 !text-coral" />
          <h2
            id="analytics-overview-title"
            className="text-sm font-black uppercase tracking-wider !text-white/60"
          >
            Overview
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {overview.map((item) => (
            <article
              key={item.label}
              className="admin-dashboard-stat min-w-0 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl sm:p-5"
            >
              <div className="grid size-9 place-items-center rounded-md text-white">
                <div className={"grid size-9 place-items-center rounded-md " + item.color}>
                  <item.icon className="size-5" />
                </div>
              </div>
              <p className="mt-5 max-w-full truncate text-[clamp(1.1rem,1.45vw,1.35rem)] font-black leading-none tracking-tight !text-white">
                {item.value}
              </p>
              <p className="mt-2 text-[11px] font-bold uppercase leading-snug tracking-wider !text-white/35">
                {item.label}
              </p>
              <p className="mt-1 text-[10px] leading-snug !text-white/35">{item.context}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 pb-8" aria-labelledby="analytics-trends-title">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="size-4 !text-coral" />
          <h2
            id="analytics-trends-title"
            className="text-sm font-black uppercase tracking-wider !text-white/60"
          >
            Performance Trends
          </h2>
        </div>
        <DashboardCharts unified expanded initialActiveKey={selectedChart} />
      </section>

      <section className="mt-8 pb-8" aria-labelledby="overall-analysis-title">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 !text-coral" />
          <h2
            id="overall-analysis-title"
            className="text-sm font-black uppercase tracking-wider !text-white/60"
          >
            Overall Analysis
          </h2>
        </div>

        <article className="admin-card rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl sm:p-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide !text-white/35">
                Player accounts
              </p>
              <p className="mt-2 text-2xl font-black !text-white">
                {analysisSnapshot.players.total.toLocaleString("en-US")}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide !text-white/35">
                PayMongo ledger revenue
              </p>
              <p className="mt-2 text-2xl font-black !text-white">
                {formatMoney(revenue.paymongoRevenue)}
              </p>
            </div>
            <div className="border-t border-white/[0.08] pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="text-[10px] font-black uppercase tracking-wide !text-coral">
                Total tracked revenue
              </p>
              <p className="mt-2 text-2xl font-black !text-white">{formatMoney(revenue.total)}</p>
            </div>
          </div>
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-coral/30 bg-coral/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide !text-coral">
                <Sparkles className="size-3" />
                Live data analysis
              </span>
              <span className="text-[10px] !text-white/35">
                Refreshes whenever the player, sales, or partnership data changes.
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed !text-white/70">{overallAnalysis}</p>
            <p className="mt-3 text-xs leading-relaxed !text-white/40">
              This analysis includes the Players Over Time trend, PayMongo sales movement, and recognized brand budgets. All figures are calculated from the current dashboard data.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
