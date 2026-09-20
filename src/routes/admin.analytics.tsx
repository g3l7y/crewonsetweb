import { createFileRoute } from "@tanstack/react-router";

import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { useSearchParams } from "@/components/next-compat/navigation";
import { topUpsStore } from "@/lib/admin-demo-data";
import { isMockMode } from "@/lib/playfab/config";
import { useAdminPlayers } from "@/lib/playfab/hooks";
import { applicationsStore, formatMoney } from "@/lib/demo/store";
import {
  Activity,
  CircleDollarSign,
  Download,
  ServerCog,
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
        content: "Review player growth, sales trends, and studio revenue context.",
      },
      { property: "og:title", content: "Analytics — Crew On Set! Admin" },
      {
        property: "og:description",
        content: "Review player growth, sales trends, and studio revenue context.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const recognizedPartnershipStatuses = new Set(["Approved", "On-going", "Done"]);

function AnalyticsPage() {
  const mockMode = isMockMode();
  const adminPlayersQuery = useAdminPlayers();
  const [applications] = applicationsStore.useStore();
  const [topUps] = topUpsStore.useStore();
  const searchParams = useSearchParams();
  const selectedChart = searchParams.get("chart") === "sales" ? "sales" : "players";

  const revenue = useMemo(() => {
    const completedTopUps = topUps
      .filter((topUp) => topUp.status === "Completed")
      .reduce((total, topUp) => total + topUp.amount, 0);
    const recognizedBrandBudgets = applications
      .filter((application) => recognizedPartnershipStatuses.has(application.status))
      .reduce((total, application) => total + application.budget, 0);

    return {
      completedTopUps,
      recognizedBrandBudgets,
      total: completedTopUps + recognizedBrandBudgets,
    };
  }, [applications, topUps]);

  const playerCount = adminPlayersQuery.isLoading ? "…" : String(adminPlayersQuery.data?.length ?? 0);
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
      value: mockMode ? "8,461" : playerCount,
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
      context: "Completed top-ups + recognized brand budgets",
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
        <p className="text-xs font-black tracking-[.18em] !text-coral">INSIGHTS</p>
        <h1 className="admin-heading mt-2 !text-white">Analytics</h1>
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
                <div className={`grid size-9 place-items-center rounded-md ${item.color}`}>
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

      <section className="mt-8 pb-8" aria-labelledby="revenue-context-title">
        <div className="mb-3 flex items-center gap-2">
          <CircleDollarSign className="size-4 !text-coral" />
          <h2
            id="revenue-context-title"
            className="text-sm font-black uppercase tracking-wider !text-white/60"
          >
            Revenue Context
          </h2>
        </div>

        <article className="admin-card rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl sm:p-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide !text-white/35">
                Completed C-Coin top-ups
              </p>
              <p className="mt-2 text-2xl font-black !text-white">
                {formatMoney(revenue.completedTopUps)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide !text-white/35">
                Recognized brand budgets
              </p>
              <p className="mt-2 text-2xl font-black !text-white">
                {formatMoney(revenue.recognizedBrandBudgets)}
              </p>
            </div>
            <div className="border-t border-white/[0.08] pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="text-[10px] font-black uppercase tracking-wide !text-coral">
                Total recognized revenue
              </p>
              <p className="mt-2 text-2xl font-black !text-white">{formatMoney(revenue.total)}</p>
            </div>
          </div>
          <p className="mt-5 border-t border-white/[0.06] pt-4 text-xs leading-relaxed !text-white/45">
{mockMode ? "Mock mode shows the curated demo trends and totals. Real mode shows only PlayFab player records and completed payment or partnership data returned by the server. Download totals and uptime remain unavailable until those real counters are configured." : "Real mode shows only PlayFab player records and completed payment or partnership data returned by the server. Download totals and uptime remain unavailable until those real counters are configured."}
          </p>
        </article>
      </section>
    </div>
  );
}
