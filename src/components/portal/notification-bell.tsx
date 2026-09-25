import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/components/next-compat/navigation";
import { Bell, Megaphone, Trophy, Users, ShoppingBag, Settings2, CheckCheck } from "lucide-react";
import { notificationsStore } from "@/lib/demo/store";
import {
  NOTIFICATION_BELL_LIMIT,
  dedupeNotifications,
  isPlayerAccountNotification,
  matchesPlayerRecipient,
  notificationHref as inboxNotificationHref,
  relativeTime as inboxRelativeTime,
  isVisibleInNotificationBell,
  sortNotificationsNewestFirst,
  type NotificationBellPreferences,
} from "@/lib/demo/inbox";
import type { PlayerNotification as PlayFabNotification } from "@/lib/playfab/types";
import { isMockMode } from "@/lib/playfab/config";
import { useNotifications, usePlayerProfile } from "@/lib/playfab/hooks";

type BellNotification = {
  id: string;
  title: string;
  body?: string | undefined;
  kind?: string | undefined;
  channel?: "notification" | "mail" | undefined;
  read: boolean;
  createdAt: string;
  href?: string | undefined;
  recipientUsername?: string | undefined;
  recipientEmail?: string | undefined;
  target?: { kind: "all" | "players"; playerIds?: string[] | undefined } | undefined;
  senderUsername?: string | undefined;
  adminMessage?: boolean | undefined;
};

const iconByKind: Record<string, typeof Bell> = {
  announcement: Megaphone,
  achievement: Trophy,
  friend: Users,
  shop: ShoppingBag,
  system: Settings2,
};

export function NotificationBell({
  dark = true,
  preferences = {},
}: {
  dark?: boolean;
  preferences?: NotificationBellPreferences;
}) {
  const mockMode = isMockMode();
  const [demoNotifications, setDemoNotifications] = notificationsStore.useStore();
  const realNotificationsQuery = useNotifications();
  const profileQuery = usePlayerProfile();
  const [realNotifications, setRealNotifications] = useState<PlayFabNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!mockMode) setRealNotifications(realNotificationsQuery.data ?? []);
  }, [mockMode, realNotificationsQuery.data]);

  const mockPlayerUsername =
    profileQuery.data?.username ?? profileQuery.data?.displayName ?? "CAMERA_PRO";
  const mockPlayerEmail = profileQuery.data?.email ?? "player@crewonset.com";
  const mockPlayerId = profileQuery.data?.playFabId ?? "MOCK-PLAYER-001";
  const notifications: BellNotification[] = mockMode
    ? demoNotifications
        .map((notification) => ({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          kind: notification.kind,
          channel: notification.channel,
          read: notification.read,
          createdAt: notification.createdAt,
          href: notification.href,
          recipientUsername: notification.recipientUsername,
          recipientEmail: notification.recipientEmail,
          target: notification.target
            ? { kind: notification.target.kind, playerIds: notification.target.playerIds }
            : undefined,
          senderUsername: notification.senderUsername,
          adminMessage: notification.adminMessage,
        }))
        .filter(
          (notification) =>
            isPlayerAccountNotification(notification) &&
            matchesPlayerRecipient(notification, mockPlayerUsername, mockPlayerEmail, mockPlayerId),
        )
    : realNotifications
        .map((notification) => ({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          kind: notification.kind,
          channel: notification.channel,
          read: notification.read,
          createdAt: notification.createdAt,
          href: notification.href,
          recipientUsername: notification.recipientUsername,
          recipientEmail: undefined,
          target: notification.target,
          senderUsername: notification.senderUsername,
          adminMessage: notification.adminMessage,
        }))
        .filter(isPlayerAccountNotification);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const bellNotifications = notifications.filter((notification) =>
    isVisibleInNotificationBell(notification, preferences),
  );
  const uniqueNotifications = dedupeNotifications(bellNotifications);
  const sortedNotifications = sortNotificationsNewestFirst(uniqueNotifications);
  const sorted = sortedNotifications.slice(0, NOTIFICATION_BELL_LIMIT);
  const unreadCount = uniqueNotifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    if (mockMode) {
      setDemoNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
    } else {
      setRealNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [id] }),
      });
    }
  }

  function markAllRead() {
    if (mockMode) {
      setDemoNotifications((current) =>
        current.map((item) =>
          isPlayerAccountNotification(item) &&
          matchesPlayerRecipient(item, mockPlayerUsername, mockPlayerEmail, mockPlayerId) &&
          uniqueNotifications.some((notification) => notification.id === item.id)
            ? { ...item, read: true }
            : item,
        ),
      );
    } else {
      const visibleIds = new Set(uniqueNotifications.map((item) => item.id));
      setRealNotifications((current) => current.map((item) => visibleIds.has(item.id) ? { ...item, read: true } : item));
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [...visibleIds] }),
      });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`portal-notification-trigger relative grid size-10 place-items-center rounded-md border transition ${
          dark
            ? "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            : "border-navy/15 bg-white text-navy/70 hover:bg-navy/5"
        }`}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-coral px-1 text-[10px] font-black leading-[18px] text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={
            dark
              ? "player-notification-dropdown absolute right-0 top-12 z-[90] w-[min(360px,88vw)] overflow-hidden rounded-xl border border-white/15 bg-[#0f1626] text-white shadow-2xl"
              : "player-notification-dropdown absolute right-0 top-12 z-[90] w-[min(360px,88vw)] overflow-hidden rounded-xl border border-navy/10 bg-white text-navy shadow-2xl"
          }
        >
          <div className="flex items-center justify-between border-b border-navy/10 px-4 py-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">Notifications</h3>
              <p className="text-xs text-navy/45">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-coral hover:text-coral-dark"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {sorted.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-navy/40">No notifications yet.</p>
            )}
            {sorted.map((notification) => {
              const Icon = iconByKind[notification.kind ?? "system"] ?? Settings2;
              return (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => {
                    markRead(notification.id);
                    setOpen(false);
                    router.push(inboxNotificationHref(notification));
                  }}
                  className={`flex w-full gap-3 border-b border-navy/5 px-4 py-3 text-left transition hover:bg-navy/[.03] ${
                    notification.read ? "opacity-70" : ""
                  }`}
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-navy/5 text-coral">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold">{notification.title}</span>
                      {!notification.read && (
                        <span className="size-1.5 shrink-0 rounded-full bg-coral" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-navy/55">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-navy/30">
                      {inboxRelativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/portal/inbox?tab=notifications");
            }}
            className="flex w-full items-center justify-between border-t border-navy/10 px-4 py-3 text-[11px] font-black uppercase tracking-wide text-coral transition hover:bg-navy/[.04]"
          >
            See more <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </div>
  );
}
