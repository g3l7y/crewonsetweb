import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Crew Portal — Crew On Set!" },
      {
        name: "description",
        content: "Your production hub: progress, rewards, and crew activity.",
      },
      { property: "og:title", content: "Crew Portal — Crew On Set!" },
      {
        property: "og:description",
        content: "Your production hub: progress, rewards, and crew activity.",
      },
    ],
  }),
  component: PlayerDashboardPage,
});

import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import { lazy, Suspense, useEffect, useMemo } from "react";
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
  Lock,
  Settings2,
} from "lucide-react";
import { cosmeticCatalog, ownedItemsStore } from "@/lib/demo/portal-shop";
import { brandUpdatesStore, gameBuildStore, notificationsStore } from "@/lib/demo/store";
import { downloadMockInstaller, getInstallerDownloadUrl } from "@/lib/game-download";
import {
  dedupeNotifications,
  isRecentPlayerActivity,
  matchesPlayerRecipient,
  RECENT_ACTIVITY_LIMIT,
  relativeTime,
  sortNotificationsNewestFirst,
} from "@/lib/demo/inbox";
import type { CosmeticItem } from "@/lib/demo/portal-shop";
import { CosmeticArt } from "@/components/portal/cosmetic-art";
import { Leaderboards } from "@/components/portal/leaderboards";
import {
  useAchievements,
  useCatalog,
  useNotifications,
  usePlayerInventory,
  usePlayerProfile,
  usePlayerLoadout,
  usePlayerProgression,
  useProductionLogs,
} from "@/lib/playfab/hooks";
import { isMockMode } from "@/lib/playfab/config";
import { sortNewestFirst } from "@/lib/validation";
import { achievementEmoji } from "@/lib/achievement-emoji";

const Avatar3DPreview = lazy(() => import("@/components/portal/avatar-3d-preview").then((module) => ({ default: module.Avatar3DPreview })));

const bundledFaceItems = cosmeticCatalog.filter((item) => item.category === "Face");
const bundledFaceIds = bundledFaceItems.map((item) => item.id);

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

const recentActivity: ActivityItem[] = sortNewestFirst(
  [
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
  ],
  (activity) => activity.createdAt,
);

function PlayerDashboardPage() {
  const mockMode = isMockMode();
  const [demoOwnedIds] = ownedItemsStore.useStore();
  const catalogQuery = useCatalog();
  const inventoryQuery = usePlayerInventory();
  const profileQuery = usePlayerProfile();
  const loadoutQuery = usePlayerLoadout();
  const progressionQuery = usePlayerProgression();
  const achievementsQuery = useAchievements();
  const productionLogsQuery = useProductionLogs();
  const realNotificationsQuery = useNotifications();
  const [gameBuilds] = gameBuildStore.useStore();
  const [brandUpdates] = brandUpdatesStore.useStore();
  const [demoNotifications] = notificationsStore.useStore();
  const currentBuild = gameBuilds[0];
  const playNowHref = getInstallerDownloadUrl(currentBuild?.downloadUrl);
  const featuredBrandUpdate = brandUpdates[0];
  useEffect(() => {
    if (featuredBrandUpdate && !mockMode) {
      void fetch(`/api/brand-updates/${encodeURIComponent(featuredBrandUpdate.id)}/impression`, {
        method: "POST",
        credentials: "include",
      });
    }
  }, [featuredBrandUpdate?.id, mockMode]);

  const displayName = profileQuery.data?.username || profileQuery.data?.displayName || "CAMERA_PRO";
  const avatarLoadout = loadoutQuery.data ?? {};
  const level = mockMode ? 27 : (progressionQuery.data?.level ?? 1);
  const currentXp = mockMode ? 6820 : (progressionQuery.data?.currentXp ?? 0);
  const xpToNextLevel = mockMode ? 10000 : (progressionQuery.data?.xpToNextLevel ?? 0);
  const progressPercent =
    xpToNextLevel > 0 ? Math.min(100, Math.round((currentXp / xpToNextLevel) * 100)) : 0;
  const dashboardCareer = mockMode
    ? career
    : [
        {
          label: "Productions Completed",
          value: String(productionLogsQuery.data?.length ?? 0),
          icon: Film,
        },
        {
          label: "Sessions Played",
          value: String(productionLogsQuery.data?.length ?? 0),
          icon: Play,
        },
        { label: "Total Play Time", value: "—", icon: Clock3 },
        {
          label: "Best Rating",
          value: productionLogsQuery.data?.length
            ? Math.max(
                ...productionLogsQuery.data.map((log) =>
                  Number(log.overallScore ?? log.score ?? 0),
                ),
              ) + "%"
            : "—",
          icon: Star,
        },
        { label: "Global Rank", value: "—", icon: Hash },
      ];
  const dashboardBadges = mockMode
    ? badges
    : Array.from({ length: 6 }, (_, index) => {
        const achievement = (achievementsQuery.data ?? []).filter((item) =>
          Boolean(item.title.trim() && item.description.trim()),
        )[index];
        return {
          id: achievement?.id ?? `real-locked-badge-${index}`,
          icon: achievementEmoji(achievement?.title ?? ""),
          name: achievement?.title ?? "",
          unlocked: Boolean(achievement?.unlocked),
        };
      });
  const dashboardActivity = mockMode
    ? sortNotificationsNewestFirst(
        dedupeNotifications(
          demoNotifications.filter(
            (notification) =>
              isRecentPlayerActivity(notification) &&
              matchesPlayerRecipient(
                notification,
                profileQuery.data?.username ?? profileQuery.data?.displayName ?? "CAMERA_PRO",
                profileQuery.data?.email ?? "player@crewonset.com",
                profileQuery.data?.playFabId ?? "MOCK-PLAYER-001",
              ),
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
          icon:
            (
              {
                announcement: Megaphone,
                achievement: Award,
                friend: UserPlus,
                shop: ShoppingBag,
                transaction: ShoppingBag,
                report: Flag,
                system: Settings2,
              } as Record<string, typeof Film>
            )[notification.kind] ?? Settings2,
        }))
    : sortNotificationsNewestFirst(
        dedupeNotifications((realNotificationsQuery.data ?? []).filter(isRecentPlayerActivity)),
      )
        .slice(0, RECENT_ACTIVITY_LIMIT)
        .map((notification) => ({
          id: notification.id,
          kind: "production" as const,
          title: notification.title,
          detail: notification.body ?? "",
          time: relativeTime(notification.createdAt),
          createdAt: notification.createdAt,
          icon:
            (
              {
                announcement: Megaphone,
                achievement: Award,
                friend: UserPlus,
                shop: ShoppingBag,
                transaction: ShoppingBag,
                report: Flag,
                system: Settings2,
              } as Record<string, typeof Film>
            )[notification.kind ?? "system"] ?? Settings2,
        }));

  const catalog = useMemo(() => {
    if (mockMode) return cosmeticCatalog;
    const liveItems = (catalogQuery.data ?? [])
      .map((remote) => {
        const category = remote.category as CosmeticItem["category"];
        if (!["Face", "Hair", "Tops", "Bottoms", "Shoe Wear", "Accessories"].includes(category))
          return null;
        const rarityValue = String(remote.rarity ?? "").toLowerCase();
        const rarity =
          rarityValue === "rare"
            ? "Rare"
            : rarityValue === "epic"
              ? "Epic"
              : rarityValue === "legendary"
                ? "Legendary"
                : "Common";
        const assetKey = remote.customData?.assetKey ?? "";
        const imageUrl = remote.customData?.imageUrl ?? "";
        const bundledAsset = cosmeticCatalog.find(
          (candidate) => candidate.id === remote.itemId || candidate.assetKey === assetKey,
        );
        return {
          id: remote.itemId,
          name: remote.displayName ?? "",
          category,
          price: remote.price ?? 0,
          rarity,
          description: remote.description ?? "",
          assetKey,
          imageUrl,
          imagePath: bundledAsset?.imagePath,
          placeholder:
            !remote.displayName &&
            !remote.description &&
            !remote.customData?.assetKey &&
            !remote.customData?.imageUrl,
        };
      })
      .filter((item): item is CosmeticItem => item !== null);
    return [
      ...liveItems,
      ...bundledFaceItems.filter((faceItem) => !liveItems.some((item) => item.id === faceItem.id)),
    ];
  }, [catalogQuery.data, mockMode]);

  const ownedIds = mockMode
    ? [...new Set([...bundledFaceIds, ...demoOwnedIds])]
    : [...new Set([...(inventoryQuery.data ?? []).map((item) => item.itemId), ...bundledFaceIds])];
  const recentMockOwnedItems = useMemo(
    () =>
      [...new Set([...bundledFaceIds, ...demoOwnedIds])]
        .map((id) => catalog.find((item) => item.id === id))
        .filter((item): item is CosmeticItem => item !== undefined)
        .slice(-2),
    [catalog, demoOwnedIds],
  );
  const recentRealOwnedItems = useMemo(
    () =>
      [
        ...(inventoryQuery.data ?? []),
        ...bundledFaceItems
          .filter((faceItem) => !(inventoryQuery.data ?? []).some((item) => item.itemId === faceItem.id))
          .map((item) => ({ itemId: item.id, acquiredAt: "" })),
      ]
        .sort((a, b) => (Date.parse(b.acquiredAt) || 0) - (Date.parse(a.acquiredAt) || 0))
        .map((inventoryItem) => catalog.find((item) => item.id === inventoryItem.itemId))
        .filter((item): item is CosmeticItem => item !== undefined)
        .slice(0, 2),
    [catalog, inventoryQuery.data],
  );
  const dashboardOwnedItems = mockMode ? recentMockOwnedItems : recentRealOwnedItems;
  const ownedItemsTotal = ownedIds.length;
  const ownedItemsLoading = !mockMode && (catalogQuery.isLoading || inventoryQuery.isLoading);

  return (
    <div className="portal-page portal-title-page min-h-screen bg-[#0b1426] px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
      <div className="portal-title-container mx-auto max-w-[1500px]">
        {/* HEADER */}
        <header className="portal-title-header">
          <h1 className="portal-title-heading text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Dashboard
          </h1>
        </header>

        {/* PLAYER PROFILE */}
        <section className="portal-card mt-7 border border-white/10 bg-white p-5 text-navy shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-yellow shadow-lg">
              <Suspense fallback={<div className="size-full bg-[#e5dac3]" aria-label={displayName + " avatar loading"} />}>
                <Avatar3DPreview loadout={avatarLoadout} displayName={displayName} portrait className="relative size-full overflow-hidden bg-[#e5dac3]" />
              </Suspense>
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
                  <div
                    className="h-full rounded-full bg-coral"
                    style={{ width: progressPercent + "%" }}
                  />
                </div>
                <span className="text-xs font-bold text-navy/45">
                  {currentXp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
                </span>
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
            src="/assets/crew-on-set-hero.jpg"
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
              id="play-now"
              href={playNowHref}
              download={currentBuild?.installerFileName || true}
              onClick={(event) => {
                if (!playNowHref.startsWith("mock-installer://")) return;
                event.preventDefault();
                void downloadMockInstaller(
                  currentBuild?.installerFileName || "CrewOnSetInstaller.exe",
                ).catch((error: unknown) =>
                  window.alert(
                    error instanceof Error ? error.message : "Installer download failed.",
                  ),
                );
              }}
              className="latest-update-play-button mt-7 inline-flex items-center gap-2 rounded-md bg-coral px-5 py-3 text-sm font-black text-white transition hover:bg-coral-dark"
            >
              <Play className="size-4 fill-current" />
              PLAY NOW
            </a>
            {featuredBrandUpdate && (
              <a
                href={
                  mockMode
                    ? featuredBrandUpdate.url
                    : `/api/brand-updates/${encodeURIComponent(featuredBrandUpdate.id)}/click`
                }
                className="mt-4 block max-w-xl rounded-lg border border-white/15 bg-black/25 p-4 text-sm text-white transition hover:border-yellow/60"
              >
                <span className="block text-[10px] font-black uppercase tracking-widest text-yellow">
                  Brand Update
                </span>
                <span className="mt-1 block font-bold">
                  {featuredBrandUpdate.notes || "Visit our featured brand"}
                </span>
              </a>
            )}
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
                <article
                  key={stat.label}
                  className="bg-[#121d32] p-5 transition hover:bg-[#17243c]"
                >
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
              href="/portal/almanac?tab=achievements"
              className="text-xs font-black text-coral transition hover:text-white"
            >
              VIEW ALL →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {dashboardBadges.map((badge) => (
              <div
                key={"id" in badge ? badge.id : badge.name}
                className={`group rounded-xl border p-5 text-center transition ${
                  badge.unlocked
                    ? "border-yellow/20 bg-yellow/[0.06] hover:-translate-y-1 hover:border-yellow/40 hover:bg-yellow/[0.09] hover:shadow-lg hover:shadow-black/20"
                    : "border-white/[0.06] bg-white/[0.02] grayscale opacity-35"
                }`}
              >
                <span className="text-3xl transition group-hover:scale-110">
                  {badge.unlocked ? (
                    badge.icon
                  ) : (
                    <Lock className="mx-auto size-6" aria-label="Locked badge" />
                  )}
                </span>

                {badge.name && (
                  <p className="badge-label mt-3 text-xs font-black uppercase text-white/80">
                    {badge.name}
                  </p>
                )}
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
              <span className="text-[10px] font-bold uppercase text-white/30">
                {ownedItemsTotal} total
              </span>
            </div>

            {ownedItemsLoading ? (
              <p className="px-5 py-8 text-center text-sm text-white/40">
                Loading your collection…
              </p>
            ) : ownedItemsTotal === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/40">
                You haven&apos;t collected any cosmetics yet.
              </p>
            ) : dashboardOwnedItems.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/40">
                Your collection is ready. Loading item artwork…
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-5">
                {dashboardOwnedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center"
                  >
                    {item.imageUrl ? (
                      <img className="owned-item-art" src={item.imageUrl} alt={`${item.name} cosmetic`} />
                    ) : item.assetKey || item.imagePath ? (
                      <CosmeticArt item={item} className="owned-item-art" />
                    ) : (
                      <div className="owned-item-art shop-art-placeholder" aria-hidden="true" />
                    )}
                    {item.name && (
                      <p className="mt-2 truncate text-xs font-bold text-white">{item.name}</p>
                    )}
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
