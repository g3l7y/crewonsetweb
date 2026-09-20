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
import { getProfileArtwork } from "@/lib/demo/profile-art";
import { useMemo } from "react";
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
  Megaphone,
  Flag,
  Settings2,
} from "lucide-react";
import { cosmeticCatalog, ownedItemsStore } from "@/lib/demo/portal-shop";
import { gameBuildStore, notificationsStore } from "@/lib/demo/store";
import {
  isActivityNotification,
  matchesPlayerRecipient,
  RECENT_ACTIVITY_LIMIT,
  relativeTime,
  sortNotificationsNewestFirst,
} from "@/lib/demo/inbox";
import type { CosmeticItem } from "@/lib/demo/portal-shop";
import { CosmeticArt } from "@/components/portal/cosmetic-art";
import { Leaderboards } from "@/components/portal/leaderboards";
import { useAchievements, useCatalog, useNotifications, usePlayerInventory, usePlayerProfile, usePlayerProgression, useProductionLogs } from "@/lib/playfab/hooks";
import { isMockMode } from "@/lib/playfab/config";
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
    detail: "{currentXp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP toward Level 28",
    time: "4 days ago",
    createdAt: "2026-08-31T12:00:00.000Z",
    icon: Sparkles,
  },
], (activity) => activity.createdAt);

function PlayerDashboardPage() {
  const mockMode = isMockMode();
  const [demoOwnedIds] = ownedItemsStore.useStore();
  const catalogQuery = useCatalog();
  const inventoryQuery = usePlayerInventory();
  const profileQuery = usePlayerProfile();
  const progressionQuery = usePlayerProgression();
  const achievementsQuery = useAchievements();
  const productionLogsQuery = useProductionLogs();
  const realNotificationsQuery = useNotifications();
  const [gameBuilds] = gameBuildStore.useStore();
  const [demoNotifications] = notificationsStore.useStore();
  const currentBuild = gameBuilds[0];
  const playNowHref = currentBuild?.downloadUrl?.trim() || "notes://";

  const displayName = profileQuery.data?.username || profileQuery.data?.displayName || "CAMERA_PRO";
  const displayAvatar = mockMode
    ? getProfileArtwork(displayName)
    : profileQuery.data?.avatarUrl || getProfileArtwork(displayName);
  const level = mockMode ? 27 : progressionQuery.data?.level ?? 1;
  const currentXp = mockMode ? 6820 : progressionQuery.data?.currentXp ?? 0;
  const xpToNextLevel = mockMode ? 10000 : progressionQuery.data?.xpToNextLevel ?? 0;
  const progressPercent = xpToNextLevel > 0 ? Math.min(100, Math.round((currentXp / xpToNextLevel) * 100)) : 0;
  const dashboardCareer = mockMode
    ? career
    : [
        { label: "Productions Completed", value: String(productionLogsQuery.data?.length ?? 0), icon: Film },
        { label: "Sessions Played", value: String(productionLogsQuery.data?.length ?? 0), icon: Play },
        { label: "Total Play Time", value: "—", icon: Clock3 },
        { label: "Best Rating", value: productionLogsQuery.data?.length ? Math.max(...productionLogsQuery.data.map((log) => Number(log.overallScore ?? log.score ?? 0))) + "%" : "—", icon: Star },
        { label: "Global Rank", value: "—", icon: Hash },
      ];
  const dashboardBadges = mockMode
    ? badges
    : (achievementsQuery.data ?? []).slice(0, 6).map((achievement, index) => ({
        icon: ["🎬", "⭐", "🏆", "🎥", "👑", "💯"][index] ?? "🎬",
        name: achievement.title,
        unlocked: achievement.unlocked,
      }));
  const dashboardActivity = mockMode
    ? sortNotificationsNewestFirst(
        demoNotifications.filter((notification) =>
          isActivityNotification(notification) &&
          matchesPlayerRecipient(
            notification,
            profileQuery.data?.username ?? profileQuery.data?.displayName ?? "CAMERA_PRO",
            profileQuery.data?.email ?? "player@crewonset.com",
            profileQuery.data?.playFabId ?? "MOCK-PLAYER-001",
          ),
        ),
      )
        .slice(0, RECENT_ACTIVITY_LIMIT)
        .map((notification) => ({
          id: notification.id,
          kind: "production" as const,
          title: notification.title,
          detail: notification.body,
          time: relativeTime(notification.createdAt),
          createdAt: notification.createdAt,
          icon: ({
            announcement: Megaphone,
            achievement: Award,
            friend: UserPlus,
            shop: ShoppingBag,
            transaction: ShoppingBag,
            report: Flag,
            system: Settings2,
          } as Record<string, typeof Film>)[notification.kind] ?? Settings2,
        }))
    : sortNotificationsNewestFirst(
        (realNotificationsQuery.data ?? []).filter(isActivityNotification),
      )
        .slice(0, RECENT_ACTIVITY_LIMIT)
        .map((notification) => ({
          id: notification.id,
          kind: "production" as const,
          title: notification.title,
          detail: notification.body ?? "",
          time: relativeTime(notification.createdAt),
          createdAt: notification.createdAt,
          icon: ({
            announcement: Megaphone,
            achievement: Award,
            friend: UserPlus,
            shop: ShoppingBag,
            transaction: ShoppingBag,
            report: Flag,
            system: Settings2,
          } as Record<string, typeof Film>)[notification.kind ?? "system"] ?? Settings2,
        }));

  const catalog = useMemo(() => {
    if (mockMode) return cosmeticCatalog;
    return (catalogQuery.data ?? [])
      .map((remote) => {
        const base = cosmeticCatalog.find((item) => item.id === remote.itemId);
        if (!base) return null;
        return {
          ...base,
          name: remote.displayName || base.name,
          price: remote.price ?? base.price,
          description: remote.description || base.description,
        };
      })
      .filter((item): item is CosmeticItem => item !== null);
  }, [catalogQuery.data, mockMode]);

  const ownedIds = mockMode
    ? demoOwnedIds
    : (inventoryQuery.data ?? []).map((item) => item.itemId);
  const ownedItems = useMemo(
    () => catalog.filter((item) => ownedIds.includes(item.id)),
    [catalog, ownedIds],
  );
  const recentMockOwnedItems = useMemo(
    () => ownedIds
      .map((id) => catalog.find((item) => item.id === id))
      .filter((item): item is CosmeticItem => item !== undefined)
      .slice(-2),
    [catalog, ownedIds],
  );
  const recentRealOwnedItems = useMemo(
    () => [...(inventoryQuery.data ?? [])]
      .sort((a, b) => new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime())
      .map((inventoryItem) => catalog.find((item) => item.id === inventoryItem.itemId))
      .filter((item): item is CosmeticItem => item !== undefined)
      .slice(0, 2),
    [catalog, inventoryQuery.data],
  );
  const dashboardOwnedItems = mockMode ? recentMockOwnedItems : recentRealOwnedItems;
  const ownedItemsTotal = mockMode ? ownedItems.length : (inventoryQuery.data?.length ?? 0);
  const ownedItemsLoading = !mockMode && (catalogQuery.isLoading || inventoryQuery.isLoading);

  return (
    <div className="portal-page portal-title-page min-h-screen bg-[#0b1426] px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
      <div className="portal-title-container mx-auto max-w-[1500px]">
        {/* HEADER */}
        <header className="portal-title-header">
          <p className="portal-title-eyebrow text-xs font-black tracking-[.18em] text-coral">PLAYER PORTAL</p>
          <h1 className="portal-title-heading mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Dashboard
          </h1>
        </header>

        {/* PLAYER PROFILE */}
        <section className="portal-card mt-7 border border-white/10 bg-white p-5 text-navy shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-yellow shadow-lg">
              <Image
                src={displayAvatar}
                alt={displayName + " avatar"}
                fill
                className="object-cover object-[62%_45%]"
              />
            </div>

            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest text-coral">
                Call time confirmed
              </p>
              <h2 className="mt-1 text-3xl font-black uppercase tracking-tight text-navy sm:text-4xl">
                Welcome back, {displayName}!
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="rounded bg-yellow px-3 py-1 text-xs font-black text-navy">
                  LEVEL {level}
                </span>
                <div className="h-2 max-w-md flex-1 overflow-hidden rounded-full bg-navy/10">
                  <div className="h-full rounded-full bg-coral" style={{ width: progressPercent + "%" }} />
                </div>
                <span className="text-xs font-bold text-navy/45">{currentXp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP</span>
              </div>
            </div>

            <Link
              href="/portal/profile"
              className="dashboard-view-profile-button inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-coral px-5 py-3 text-xs font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-coral/20 transition hover:-translate-y-0.5 hover:bg-coral/90"
            >
              <User className="size-4" />
              View Profile
            </Link>
          </div>
        </section>

        {/* LATEST UPDATE */}
        <section className="latest-update-card on-dark relative mt-6 overflow-hidden rounded-xl bg-[#111c30]">
          <Image
            src={displayAvatar}
            alt="Crew On Set version 1.4"
            fill
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,20,38,.98),rgba(11,20,38,.55))]" />
          <div className="relative p-7 sm:p-10">
            <p className="text-xs font-black tracking-[.2em] text-yellow">LATEST UPDATE</p>
            <h2 className="mt-3 max-w-xl text-4xl font-black uppercase leading-[.9] tracking-tight text-white sm:text-5xl">
              Crew On Set! <span className="text-coral">v{currentBuild?.version ?? "1.4"}</span>
            </h2>
            <p className="mt-4 text-lg text-white/75">Miss your crew? Play the game now.</p>
            <a
              href={playNowHref}
              target="_blank"
              rel="noreferrer"
              className="latest-update-play-button mt-7 inline-flex items-center gap-2 rounded-md bg-coral px-5 py-3 text-sm font-black text-white transition hover:bg-coral-dark"
            >
              <Play className="size-4 fill-current" />
              PLAY NOW
            </a>
          </div>
        </section>

        {/* CAREER OVERVIEW */}
        <section className="career-overview-panel mt-8">
          <div className="mb-4 flex items-center gap-3">
            <Trophy className="size-5 text-[#d9a514]" />
            <h2 className="text-lg font-black uppercase text-white">Career Overview</h2>
          </div>

          <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-5">
            {dashboardCareer.map((stat) => {
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
        <section className="badges-panel mt-8 overflow-hidden rounded-xl border border-white/10 bg-[#121d32] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="badges-copy text-lg font-black uppercase !text-[#0a0e19]">Badges</h2>
              <p className="badges-copy mt-1 text-sm !text-[#0a0e19]">
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
            {dashboardBadges.map((badge) => (
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

                <p className="badge-label mt-3 text-xs font-black uppercase text-white/80">
                  {badge.name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* RECENT ACTIVITY + OWNED ITEMS */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* RECENT ACTIVITY */}
          <section className="dashboard-recent-activity-card overflow-hidden rounded-xl border border-white/10 bg-[#121d32]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-white">
                Recent Activity
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase text-white/30">Last 7 days</span>
                <Link
                  href="/portal/inbox?tab=notifications"
                  className="text-[10px] font-black uppercase tracking-wide text-coral transition hover:text-yellow"
                >
                  See more →
                </Link>
              </div>
            </div>
            <ul className="divide-y divide-white/5">
              {dashboardActivity.map((activity) => {
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
          <section className="dashboard-owned-items-card overflow-hidden rounded-xl border border-white/10 bg-[#121d32]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-white">Owned Items</h2>
              <span className="text-[10px] font-bold uppercase text-white/30">{ownedItemsTotal} total</span>
            </div>

            {ownedItemsLoading ? (
              <p className="px-5 py-8 text-center text-sm text-white/40">
                Syncing your collection…
              </p>
            ) : ownedItemsTotal === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/40">
                You haven&apos;t collected any cosmetics yet.
              </p>
            ) : dashboardOwnedItems.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/40">
                Your collection is synced, but item artwork is still loading.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-5">
                {dashboardOwnedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center"
                  >
                    <CosmeticArt item={item} className="owned-item-art" />
                    <p className="mt-2 truncate text-xs font-bold text-white">{item.name}</p>
                    <p className="text-[10px] uppercase text-white/30">{item.category}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-white/10 p-4">
              <Link
                href="/portal/shop?view=owned"
                className="dashboard-collection-button flex w-full items-center justify-center gap-2 rounded-md bg-coral px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:opacity-90"
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
            className="dashboard-action-manage-friends inline-flex items-center gap-2 rounded-md border border-navy bg-[#121d32] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:brightness-95"
          >
            <UserPlus className="size-4" /> Manage Friends
          </Link>
          <Link
            href="/portal/almanac"
            className="dashboard-action-almanac inline-flex items-center gap-2 rounded-md border border-navy bg-[#121d32] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:brightness-95"
          >
            <Award className="size-4" /> View Almanac
          </Link>
        </div>
      </div>
    </div>
  );
}
