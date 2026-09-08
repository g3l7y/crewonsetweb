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
  Activity,
  BadgeCheck,
  BookOpen,
  CircleDollarSign,
  Clock,
  Download,
  FileText,
  Gamepad2,
  Images,
  MailWarning,
  MessageSquare,
  ServerCog,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { adminActivityStore, contentStatsStore, gameBuildStore, messagesStore } from "@/lib/demo/store";
import { sortNewestFirst } from "@/lib/validation";

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
  const [activity] = adminActivityStore.useStore();
  const [contentStats] = contentStatsStore.useStore();
  const [messages] = messagesStore.useStore();
  const [gameBuilds] = gameBuildStore.useStore();

  const gameBuild = gameBuilds[0];
  const contentTotals = contentStats[0];

  const playerActivity = useMemo(
    () => activity.filter((entry) => entry.kind === "player").slice(0, 2),
    [activity],
  );

  const recentActivity = useMemo(() => sortNewestFirst(activity, (entry) => entry.createdAt).slice(0, 6), [activity]);
  const messageCounts = useMemo(() => {
    const unread = messages.filter((m) => m.status === "Unread").length;
    const inProgress = messages.filter((m) => m.status === "In Progress").length;
    const resolved = messages.filter((m) => m.status === "Resolved").length;
    return { unread, inProgress, resolved, total: messages.length };
  }, [messages]);

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      {/* PAGE HEADER */}
      <header className="mb-8">
        <p className="text-xs font-black tracking-[.18em] !text-coral">CONTROL ROOM</p>

        <h1 className="admin-heading mt-2 !text-white">Dashboard</h1>

        <p className="admin-kicker !text-white/45">
          Studio performance and player activity at a glance.
        </p>
      </header>

      {/* STAT CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div
                className={`grid size-10 place-items-center rounded-md ${stat.color} text-white`}
              >
                <stat.icon className="size-5" />
              </div>

              <span className="rounded bg-[#2d9d8f]/15 px-2 py-1 text-[10px] font-black text-[#4bc4b4]">
                {stat.change}
              </span>
            </div>

            <p className="mt-6 text-3xl font-black tracking-tight !text-white">{stat.value}</p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">
              {stat.label}
            </p>
          </article>
        ))}

        {/* SERVER STATUS */}
        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="grid size-10 place-items-center rounded-md bg-[#2d9d8f] text-white">
              <ServerCog className="size-5" />
            </div>

            <span className="flex items-center gap-1.5 rounded bg-[#2d9d8f]/15 px-2 py-1 text-[10px] font-black text-[#4bc4b4]">
              <span className="size-1.5 animate-pulse rounded-full bg-[#4bc4b4]" />
              LIVE
            </span>
          </div>

          <p className="mt-6 text-3xl font-black tracking-tight !text-white">Operational</p>

          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider !text-white/35">
            <Activity className="size-3" />
            Server Status · 99.98% uptime
          </p>
        </article>
      </section>

      {/* DASHBOARD CHARTS */}
      <div className="mt-6">
        <DashboardCharts />
      </div>

      {/* MANAGEMENT SUMMARY CARDS */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="grid size-10 place-items-center rounded-md bg-coral text-white">
              <Users className="size-5" />
            </div>
            <Link
              href="/admin/players"
              className="text-[11px] font-black uppercase tracking-wide !text-coral hover:!text-white"
            >
              Manage →
            </Link>
          </div>
          <p className="mt-5 text-sm font-black uppercase tracking-wider !text-white">Players</p>
          <div className="mt-3 space-y-2">
            {playerActivity.length === 0 && (
              <p className="text-xs !text-white/35">No recent player activity.</p>
            )}
            {playerActivity.map((entry) => (
              <div key={entry.id} className="rounded-md bg-[#101923] p-2.5">
                <p className="text-xs font-bold !text-white/80">{entry.label}</p>
                <p className="mt-0.5 truncate text-[11px] !text-white/40">{entry.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="grid size-10 place-items-center rounded-md bg-[#7c5cff] text-white">
              <Images className="size-5" />
            </div>
            <Link
              href="/admin/game"
              className="text-[11px] font-black uppercase tracking-wide !text-coral hover:!text-white"
            >
              View →
            </Link>
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight !text-white">
            {contentTotals?.galleryItems ?? 0}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">
            Gallery Items
          </p>
        </article>

        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="grid size-10 place-items-center rounded-md bg-[#4b9bff] text-white">
              <MessageSquare className="size-5" />
            </div>
            <Link
              href="/admin"
              className="text-[11px] font-black uppercase tracking-wide !text-coral hover:!text-white"
            >
              View Inbox →
            </Link>
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight !text-white">
            {messageCounts.total}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">Messages</p>
        </article>

        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="grid size-10 place-items-center rounded-md bg-[#d9a514] text-white">
              <Gamepad2 className="size-5" />
            </div>
            <Link
              href="/admin/game"
              className="text-[11px] font-black uppercase tracking-wide !text-coral hover:!text-white"
            >
              Manage →
            </Link>
          </div>
          <p className="mt-5 text-lg font-black tracking-tight !text-white">
            v{gameBuild?.version ?? "—"} · Build {gameBuild?.buildNumber ?? "—"}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">
            Current Game Build
          </p>
        </article>
      </section>

      {/* CONTENT SECTION */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider !text-white/60">
          <FileText className="size-4 !text-coral" />
          Content
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Published News", value: contentTotals?.publishedNews ?? 0, icon: BadgeCheck },
            {
              label: "Draft News / Articles",
              value: contentTotals?.draftNews ?? 0,
              icon: FileText,
            },
            { label: "Gallery Items", value: contentTotals?.galleryItems ?? 0, icon: Images },
            { label: "FAQ Entries", value: contentTotals?.faqEntries ?? 0, icon: BookOpen },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl"
            >
              <item.icon className="size-5 !text-white/40" />
              <p className="mt-4 text-2xl font-black tracking-tight !text-white">{item.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">
                {item.label}
              </p>
            </article>
          ))}
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
              className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl"
            >
              <p className="text-2xl font-black tracking-tight !text-white">{item.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">
                {item.label}
              </p>
            </article>
          ))}
        </div>
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
              className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl"
            >
              <p className="truncate text-lg font-black tracking-tight !text-white">{item.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">
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
          <ul className="divide-y divide-white/[0.06]">
            {recentActivity.length === 0 && (
              <li className="py-6 text-center text-sm !text-white/35">No recent activity.</li>
            )}
            {recentActivity.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
                <span
                  className={`rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                    activityKindStyles[entry.kind] ?? "bg-white/10 text-white/60"
                  }`}
                >
                  {entry.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold !text-white">{entry.label}</p>
                  <p className="truncate text-xs !text-white/40">{entry.detail}</p>
                </div>
                <span className="shrink-0 text-[11px] !text-white/30">
                  {formatDate(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </div>
  );
}
