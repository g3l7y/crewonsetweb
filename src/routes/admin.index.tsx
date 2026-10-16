import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Studio Dashboard — Crew On Set! Admin" },
      { name: "description", content: "Studio operations overview for Crew On Set!." },
      { property: "og:title", content: "Studio Dashboard — Crew On Set! Admin" },
      { property: "og:description", content: "Studio operations overview for Crew On Set!." },
    ],
  }),
  component: AdminDashboardPage,
});

import Link from "@/components/next-compat/link";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import {
  CircleDollarSign,
  Clock,
  Download,
  Gamepad2,
  MailWarning,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { topUpsStore } from "@/lib/admin-demo-data";
import { useAdminPayMongoOrders } from "@/lib/admin-paymongo-orders";
import { formatMoney, gameBuildStore, messagesStore, revenueStore } from "@/lib/demo/store";
import { isMockMode } from "@/lib/playfab/config";
import { useAdminBugReports, useAdminNotifications, useAdminPlayerReports, useAdminPlayers, useProgressLeaderboard } from "@/lib/playfab/hooks";
import { adminNotificationsStore, bugReportsStore, playerReportsStore } from "@/lib/demo/store";
import { buildAlerts } from "@/components/admin/admin-alerts";

const stats = [
  {
    label: "Total Users",
    value: "24,892",
    change: "+12.4%",
    icon: Users,
    color: "bg-coral",
  },
  {
    label: "Active Players",
    value: "8,461",
    change: "+8.2%",
    icon: UserCheck,
    color: "bg-[#2d9d8f]",
  },
  {
    label: "Total Downloads",
    value: "68,320",
    change: "+18.7%",
    icon: Download,
    color: "bg-[#d9a514]",
  },
  {
    label: "Total Revenue",
    value: "₱184,260",
    change: "+14.1%",
    icon: CircleDollarSign,
    color: "bg-[#243241]",
  },
];


const activityKindStyles: Record<string, string> = {
  player: "bg-coral/15 text-[#ff7663]",
  news: "bg-[#2d9d8f]/15 text-[#4bc4b4]",
  gallery: "bg-[#7c5cff]/15 text-[#a894ff]",
  game: "bg-[#d9a514]/15 text-[#e1b42b]",
  announcement: "bg-[#4b9bff]/15 text-[#7fb6ff]",
  almanac: "bg-[#43b581]/15 text-[#6cd6a3]",
  bug: "bg-coral/15 text-[#ff7663]",
  transaction: "bg-[#d9a514]/15 text-[#e1b42b]",
  content: "bg-[#7c5cff]/15 text-[#a894ff]",
  system: "bg-white/10 text-white/60",
  partnership: "bg-[#d9a514]/15 text-[#e1b42b]",
  "player-report": "bg-coral/15 text-[#ff7663]",
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AdminDashboardPage() {
  const mockMode = isMockMode();
  const adminPlayersQuery = useAdminPlayers();
  const progressLeaderboardQuery = useProgressLeaderboard();
  const liveBugReportsQuery = useAdminBugReports();
  const livePlayerReportsQuery = useAdminPlayerReports();
  const liveAdminNotificationsQuery = useAdminNotifications();
  const [demoRevenue] = revenueStore.useStore();
  const [demoBugs] = bugReportsStore.useStore();
  const [demoPlayerReports] = playerReportsStore.useStore();
  const [demoAdminNotifications] = adminNotificationsStore.useStore();
  const [messages] = messagesStore.useStore();
  const [gameBuilds] = gameBuildStore.useStore();
  const [demoTopUps] = topUpsStore.useStore();
  const liveTopUpsQuery = useAdminPayMongoOrders();
  const topUps = useMemo(
    () => (mockMode ? demoTopUps : (liveTopUpsQuery.data ?? [])),
    [demoTopUps, liveTopUpsQuery.data, mockMode],
  );

  const gameBuild = gameBuilds[0];
  const alerts = useMemo(() => buildAlerts(
    mockMode ? demoBugs : (liveBugReportsQuery.data ?? []),
    mockMode ? demoPlayerReports : (livePlayerReportsQuery.data ?? []),
    topUps,
    mockMode ? demoAdminNotifications : (liveAdminNotificationsQuery.data ?? []),
  ), [demoAdminNotifications, demoBugs, demoPlayerReports, liveAdminNotificationsQuery.data, liveBugReportsQuery.data, livePlayerReportsQuery.data, mockMode, topUps]);
  const recentActivity = alerts.slice(0, 5);
  const messageCounts = useMemo(() => {
    const unread = messages.filter((m) => m.status === "Unread").length;
    const inProgress = messages.filter((m) => m.status === "In Progress").length;
    const resolved = messages.filter((m) => m.status === "Resolved").length;
    return { unread, inProgress, resolved, total: messages.length };
  }, [messages]);

  const dashboardStats = useMemo(() => {
    const paymongoRevenue = topUps
      .filter((topUp) => topUp.status === "Completed")
      .reduce((total, topUp) => total + topUp.amount, 0);
    if (!mockMode) {
      const playerCount = adminPlayersQuery.isLoading
        ? "…"
        : String(adminPlayersQuery.data?.length ?? 0);
      return stats.map((stat) => {
        if (stat.label === "Total Users" || stat.label === "Active Players") {
          return { ...stat, value: playerCount, change: "—" };
        }
        if (stat.label === "Total Downloads") {
          return { ...stat, value: "—", change: "—" };
        }
        return {
          ...stat,
          value: formatMoney(paymongoRevenue),
          change: "—",
        };
      });
    }

    return stats.map((stat) =>
      stat.label === "Total Revenue"
        ? { ...stat, value: formatMoney(paymongoRevenue + demoRevenue.reduce((total, record) => total + record.revenue, 0)) }
        : stat,
    );
  }, [adminPlayersQuery.data, adminPlayersQuery.isLoading, demoRevenue, mockMode, topUps]);

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      {/* PAGE HEADER */}
      <header className="mb-8">
        <h1 className="admin-heading !text-white">Dashboard</h1>

        <p className="admin-kicker !text-white/45">
          Studio performance and player activity at a glance.
        </p>
      </header>

      {/* STAT CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {dashboardStats.map((stat) => (
          <article
            key={stat.label}
            className="admin-dashboard-stat min-w-0 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl sm:p-5"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div
                className={`grid size-9 shrink-0 place-items-center rounded-md ${stat.color} text-white`}
              >
                <stat.icon className="size-5" />
              </div>

              <span className="shrink-0 rounded bg-[#2d9d8f]/15 px-2 py-1 text-[10px] font-black text-[#4bc4b4]">
                {stat.change}
              </span>
            </div>

            <p className="admin-stat-value mt-5 max-w-full whitespace-nowrap text-[clamp(1.2rem,1.55vw,1.4rem)] font-black leading-none tracking-tight !text-white">
              {stat.value}
            </p>

            <p className="mt-2 text-[11px] font-bold uppercase leading-snug tracking-wider !text-white/35">
              {stat.label}
            </p>
          </article>
        ))}

        {/* CURRENT GAME BUILD */}
        <article className="admin-dashboard-stat min-w-0 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl sm:p-5">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[#d9a514] text-white">
              <Gamepad2 className="size-5" />
            </div>
            <Link href="/admin/game" className="text-[10px] font-black uppercase tracking-wide !text-coral hover:!text-white">
              Manage →
            </Link>
          </div>

          <p className="admin-stat-value mt-5 max-w-full whitespace-nowrap text-[clamp(1.1rem,1.45vw,1.3rem)] font-black leading-none tracking-tight !text-white">
            v{gameBuild?.version ?? "—"} · Build {gameBuild?.buildNumber ?? "—"}
          </p>

          <p className="mt-2 text-[11px] font-bold uppercase leading-snug tracking-wider !text-white/35">
            Current Game Build
          </p>
        </article>
      </section>

      {/* GAME SECTION */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider !text-white/60">
            <Gamepad2 className="size-4 !text-coral" />
            Game
          </h2>
          <Link
            href="/admin/game"
            className="mb-3 text-[11px] font-black uppercase tracking-wide !text-coral hover:!text-white"
          >
            Manage →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Current Version", value: gameBuild?.version ?? "—" },
            { label: "Build Number", value: gameBuild?.buildNumber ?? "—" },
            { label: "Windows Requirement", value: gameBuild?.minWindows ?? "—" },
            { label: "Release Date", value: gameBuild ? formatDate(gameBuild.releasedAt) : "—" },
          ].map((item) => (
            <article
              key={item.label}
              className="admin-dashboard-card min-w-0 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl sm:p-5"
            >
              <p className="max-w-full truncate text-[clamp(1rem,1.2vw,1.15rem)] font-black leading-tight tracking-tight !text-white">{item.value}</p>
              <p className="mt-2 text-[11px] font-bold uppercase leading-snug tracking-wider !text-white/35">
                {item.label}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* DASHBOARD CHARTS */}
      <div className="mt-6">
          <DashboardCharts showViewMore unified={false} />
      </div>

      <section className="mt-8 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider !text-white">
              <Trophy className="size-4 text-yellow" /> Player Leaderboard
            </h2>
            <p className="mt-1 text-xs !text-white/40">Ranked by average score from saved productions.</p>
          </div>
          <Link href="/admin/players" className="text-[11px] font-black uppercase tracking-wide !text-coral hover:!text-white">
            Manage Players →
          </Link>
        </div>
        <div className="h-[280px] overflow-x-auto overflow-y-scroll rounded-md border border-white/[0.06]">
          <table className="w-full min-w-[560px] text-left">
            <thead className="sticky top-0 bg-[#101923]">
              <tr>
                {["Rank", "Player", "Level", "Productions", "Average Score"].map((label) => (
                  <th key={label} className="px-3 py-3 text-[10px] font-black uppercase tracking-wider !text-white/40">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(progressLeaderboardQuery.data ?? []).map((entry) => (
                <tr key={entry.playFabId} className="border-t border-white/[0.05]">
                  <td className="px-3 py-3 text-sm font-black !text-yellow">{entry.position}</td>
                  <td className="px-3 py-3 text-sm font-bold !text-white">{entry.displayName}</td>
                  <td className="px-3 py-3 text-sm !text-white/60">{entry.level}</td>
                  <td className="px-3 py-3 text-sm !text-white/60">{entry.productions}</td>
                  <td className="px-3 py-3 text-sm font-black !text-white">{entry.averageScore.toFixed(1)}</td>
                </tr>
              ))}
              {!progressLeaderboardQuery.isLoading && (progressLeaderboardQuery.data?.length ?? 0) === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm !text-white/40">No players have saved production progress yet.</td></tr>
              )}
              {progressLeaderboardQuery.isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm !text-white/40">Loading player progress…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* COMMUNICATION SECTION */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider !text-white/60">
          <MailWarning className="size-4 !text-coral" />
          Communication
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Unread", value: messageCounts.unread },
            { label: "In Progress", value: messageCounts.inProgress },
            { label: "Resolved", value: messageCounts.resolved },
            { label: "Total", value: messageCounts.total },
          ].map((item) => (
            <article
              key={item.label}
              className="admin-dashboard-card min-w-0 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl sm:p-5"
            >
              <p className="max-w-full whitespace-nowrap text-[clamp(1.2rem,1.55vw,1.4rem)] font-black leading-none tracking-tight !text-white">{item.value}</p>
              <p className="mt-2 text-[11px] font-bold uppercase leading-snug tracking-wider !text-white/35">
                {item.label}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider !text-white/60">
          <Clock className="size-4 !text-coral" />
          Recent Activity
        </h2>
        <div className="admin-card rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl">
          <div className="min-h-[360px] max-h-[360px] overflow-y-auto">
            <ul className="divide-y divide-white/[0.06]">
              {recentActivity.length === 0 && (
                <li className="py-6 text-center text-sm !text-white/35">No recent activity.</li>
              )}
              {recentActivity.map((entry) => (
                <li key={entry.id}>
                  <Link href={entry.href} className="flex flex-wrap items-center gap-3 py-3 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral">
                  <span
                    className={`rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                      activityKindStyles[entry.kind] ?? "bg-white/10 text-white/60"
                    }`}
                  >
                    {entry.kind}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold !text-white">{entry.title}</p>
                    <p className="truncate text-xs !text-white/40">{entry.body}</p>
                  </div>
                  <span className="shrink-0 text-[11px] !text-white/30">
                    {formatDate(entry.createdAt)}
                  </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex justify-end border-t border-white/[0.06] pt-3">
              <Link
                href="/admin/notifications"
                className="text-[11px] font-black uppercase tracking-[.14em] !text-coral transition hover:!text-white"
              >
                View More
              </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
