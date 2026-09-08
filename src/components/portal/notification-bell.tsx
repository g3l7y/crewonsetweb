import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/components/next-compat/navigation";
import {
  Bell,
  Megaphone,
  Trophy,
  Users,
  ShoppingBag,
  Settings2,
  CheckCheck,
} from "lucide-react";
import {
  notificationsStore,
  type PlayerNotification,
} from "@/lib/demo/store";

const iconByKind: Record<PlayerNotification["kind"], typeof Bell> = {
  announcement: Megaphone,
  achievement: Trophy,
  friend: Users,
  shop: ShoppingBag,
  system: Settings2,
};

/** Fallback in-app destination per notification kind when no explicit href is set. */
const hrefByKind: Record<PlayerNotification["kind"], string> = {
  announcement: "/portal",
  achievement: "/portal/achievements",
  friend: "/portal/friends",
  shop: "/portal/shop",
  system: "/portal",
};

function notificationHref(notification: PlayerNotification) {
  return notification.href ?? hrefByKind[notification.kind];
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell({ dark = true }: { dark?: boolean }) {
  const [notifications, setNotifications] = notificationsStore.useStore();
  const [open, setOpen] = useState(false);
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

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function markAllRead() {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`relative grid size-10 place-items-center rounded-md border transition ${
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
        <div className="absolute right-0 top-12 z-[90] w-[min(360px,88vw)] overflow-hidden rounded-xl border border-navy/10 bg-white text-navy shadow-2xl">
          <div className="flex items-center justify-between border-b border-navy/10 px-4 py-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Notifications
              </h3>
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
              <p className="px-4 py-8 text-center text-sm text-navy/40">
                No notifications yet.
              </p>
            )}
            {sorted.map((notification) => {
              const Icon = iconByKind[notification.kind];
              return (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => {
                    markRead(notification.id);
                    setOpen(false);
                    router.push(notificationHref(notification));
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
                      <span className="truncate text-sm font-bold">
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="size-1.5 shrink-0 rounded-full bg-coral" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-navy/55">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-navy/30">
                      {relativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
