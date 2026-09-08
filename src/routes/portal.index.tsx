import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Crew Portal — Crew On Set!" },
      { name: "description", content: "Your production hub: progress, rewards, and crew activity." },
      { property: "og:title", content: "Crew Portal — Crew On Set!" },
      { property: "og:description", content: "Your production hub: progress, rewards, and crew activity." },
    ],
  }),
  component: PlayerDashboardPage,
});

import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import {
  Clock3,
  Film,
  Hash,
  Play,
  Star,
  Trophy,
  Award,
  ShoppingBag,
  UserPlus,
  Sparkles,
  ArrowRight,
  User,
} from "lucide-react";
import { cosmeticCatalog, ownedItemsStore } from "@/lib/demo/portal-shop";
import { Leaderboards } from "@/components/portal/leaderboards";
import { sortNewestFirst } from "@/lib/validation";

const badges = [
  {
    icon: "🎬",
    name: "First Day",
    unlocked: true,
  },
  {
    icon: "⭐",
    name: "Perfect Take",
    unlocked: true,
  },
  {
    icon: "🏆",
    name: "Box Office",
    unlocked: true,
  },
  {
    icon: "🎥",
    name: "Camera Pro",
    unlocked: true,
  },
  {
    icon: "👑",
    name: "Legendary",
    unlocked: false,
  },
  {
    icon: "💯",
    name: "Ten Perfects",
    unlocked: false,
  },
];

const career = [
  { label: "Productions Completed", value: "87", icon: Film },
  { label: "Sessions Played", value: "214", icon: Play },
  { label: "Total Play Time", value: "146h", icon: Clock3 },
  { label: "Best Rating", value: "98%", icon: Star },
  { label: "Global Rank", value: "#1,284", icon: Hash },
];

type ActivityItem = {
  id: string;
  kind: "production" | "session" | "achievement" | "purchase" | "level";
  title: string;
  detail: string;
  time: string;
  createdAt: string;
  icon: typeof Film;
};

const recentActivity: ActivityItem[] = sortNewestFirst([
  {
    id: "act-1",
    kind: "production",
    title: "Wrapped “Northline Optics — NL-70 Launch”",
    detail: "Scored 94% as Cameraman",
    time: "2 hours ago",
    createdAt: "2026-09-04T08:00:00.000Z",
    icon: Film,
  },
  {
    id: "act-2",
    kind: "achievement",
    title: "Achievement unlocked — One Take Wonder",
    detail: "+450 XP awarded",
    time: "Yesterday",
    createdAt: "2026-09-03T18:00:00.000Z",
    icon: Award,
  },
  {
    id: "act-3",
    kind: "session",
    title: "Completed a practice session",
    detail: "Lighting department drill, 38 minutes",
    time: "Yesterday",
    createdAt: "2026-09-03T12:00:00.000Z",
    icon: Play,
  },
  {
    id: "act-4",
    kind: "purchase",
    title: "Purchased Studio Curls",
    detail: "400 C-Coins spent in the Shop",
    time: "2 days ago",
    createdAt: "2026-09-02T12:00:00.000Z",
    icon: ShoppingBag,
  },
  {
    id: "act-5",
    kind: "level",
    title: "Reached Crew Level 27",
    detail: "6,820 / 10,000 XP toward Level 28",
    time: "4 days ago",
    createdAt: "2026-08-31T12:00:00.000Z",
    icon: Sparkles,
  },
], (activity) => activity.createdAt);

function PlayerDashboardPage() {
  const [ownedIds] = ownedItemsStore.useStore();
  const ownedItems = cosmeticCatalog.filter((item) => ownedIds.includes(item.id)).slice(0, 4);

  return (
    <div className="portal-page min-h-screen bg-[#0b1426] px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        {/* HEADER */}
        <header>
          <p className="text-xs font-black tracking-[.18em] text-coral">PLAYER PORTAL</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Dashboard
          </h1>
        </header>

        {/* PLAYER PROFILE */}
        <section className="portal-card mt-7 border border-white/10 bg-white p-5 text-navy shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-yellow shadow-lg">
              <Image
                src="/assets/hero-key-art.png"
                alt="CAMERA_PRO avatar"
                fill
                className="object-cover object-[62%_45%]"
              />
            </div>

            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest text-coral">
                Call time confirmed
              </p>
              <h2 className="mt-1 text-3xl font-black uppercase tracking-tight text-navy sm:text-4xl">
                Welcome back, CAMERA_PRO!
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="rounded bg-yellow px-3 py-1 text-xs font-black text-navy">
                  LEVEL 27
                </span>
                <div className="h-2 max-w-md flex-1 overflow-hidden rounded-full bg-navy/10">
                  <div className="h-full w-[68%] rounded-full bg-coral" />
                </div>
                <span className="text-xs font-bold text-navy/45">6,820 / 10,000 XP</span>
              </div>
            </div>

            <Link
              href="/portal/profile"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-coral px-5 py-3 text-xs font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-coral/20 transition hover:-translate-y-0.5 hover:bg-coral/90"
            >
              <User className="size-4" />
              View Profile
            </Link>
          </div>
        </section>

        {/* LATEST UPDATE */}
        <section className="on-dark relative mt-6 overflow-hidden rounded-xl bg-[#111c30] shadow-xl">
          <Image
            src="/assets/gameplay-shot.png"
            alt="Crew On Set version 1.4"
            fill
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,20,38,.98),rgba(11,20,38,.55))]" />
          <div className="relative p-7 sm:p-10">
            <p className="text-xs font-black tracking-[.2em] text-yellow">LATEST UPDATE</p>
            <h2 className="mt-3 max-w-xl text-4xl font-black uppercase leading-[.9] tracking-tight text-white sm:text-5xl">
              Crew On Set! <span className="text-coral">v1.4</span>
            </h2>
            <p className="mt-4 text-lg text-white/75">Miss your crew? Play the game now.</p>
            <a
              href="notes://"
              className="mt-7 inline-flex items-center gap-2 rounded-md bg-coral px-5 py-3 text-sm font-black text-white transition hover:bg-coral-dark"
            >
              <Play className="size-4 fill-current" />
              PLAY NOW
            </a>
          </div>
        </section>

        {/* CAREER OVERVIEW */}
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <Trophy className="size-5 text-[#d9a514]" />
            <h2 className="text-lg font-black uppercase text-white">Career Overview</h2>
          </div>

          <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-5">
            {career.map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.label} className="bg-[#121d32] p-5 transition hover:bg-[#17243c]">
                  <Icon className="size-5 text-coral" />
                  <p className="mt-5 text-3xl font-black tracking-tight text-white">{stat.value}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/45">
                    {stat.label}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* BADGES */}
        <section className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-[#121d32] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase text-white">Badges</h2>
              <p className="mt-1 text-sm text-white/40">
                Your collected production milestones
              </p>
            </div>

            <Link
              href="/portal/almanac"
              className="text-xs font-black text-coral transition hover:text-white"
            >
              VIEW ALL →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {badges.map((badge) => (
              <div
                key={badge.name}
                className={`group rounded-xl border p-5 text-center transition ${
                  badge.unlocked
                    ? "border-yellow/20 bg-yellow/[0.06] hover:-translate-y-1 hover:border-yellow/40 hover:bg-yellow/[0.09] hover:shadow-lg hover:shadow-black/20"
                    : "border-white/[0.06] bg-white/[0.02] grayscale opacity-35"
                }`}
              >
                <span className="text-3xl transition group-hover:scale-110">
                  {badge.unlocked ? badge.icon : "🔒"}
                </span>

                <p className="mt-3 text-xs font-black uppercase text-white/80">
                  {badge.name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* RECENT ACTIVITY + OWNED ITEMS */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* RECENT ACTIVITY */}
          <section className="overflow-hidden rounded-xl border border-white/10 bg-[#121d32]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-white">
                Recent Activity
              </h2>
              <span className="text-[10px] font-bold uppercase text-white/30">Last 7 days</span>
            </div>
            <ul className="divide-y divide-white/5">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <li key={activity.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-coral">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{activity.title}</p>
                      <p className="mt-0.5 text-xs text-white/45">{activity.detail}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-white/25">
                      {activity.time}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* OWNED ITEMS */}
          <section className="overflow-hidden rounded-xl border border-white/10 bg-[#121d32]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-white">Owned Items</h2>
              <span className="text-[10px] font-bold uppercase text-white/30">{ownedIds.length} total</span>
            </div>

            {ownedItems.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/40">
                You haven&apos;t collected any cosmetics yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-5">
                {ownedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center"
                  >
                    <div
                      className={`mx-auto grid size-12 place-items-center rounded-full bg-gradient-to-br text-sm font-black text-white ${item.gradient}`}
                    >
                      {item.initials}
                    </div>
                    <p className="mt-2 truncate text-xs font-bold text-white">{item.name}</p>
                    <p className="text-[10px] uppercase text-white/30">{item.category}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-white/10 p-4">
              <Link
                href="/portal/shop"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-coral px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:opacity-90"
              >
                View Full Collection
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </section>
        </div>

        {/* LEADERBOARDS */}
        <Leaderboards />

        {/* QUICK LINKS */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/portal/friends"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#121d32] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:border-coral/40 hover:text-white"
          >
            <UserPlus className="size-4" /> Manage Friends
          </Link>
          <Link
            href="/portal/almanac"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#121d32] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:border-coral/40 hover:text-white"
          >
            <Award className="size-4" /> View Achievements
          </Link>
        </div>
      </div>
    </div>
  );
}
