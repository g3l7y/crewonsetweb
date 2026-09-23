export type NotificationLike = {
  kind?: string | undefined;
  href?: string | undefined;
  channel?: "notification" | "mail" | undefined;
  recipientUsername?: string | undefined;
  recipientEmail?: string | undefined;
  target?: { kind: "all" | "players"; playerIds?: string[] | undefined } | undefined;
};

export const RECENT_ACTIVITY_LIMIT = 5;
export const NOTIFICATION_BELL_LIMIT = 10;

export function sortNotificationsNewestFirst<T extends { createdAt: string }>(notifications: T[]) {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

const hrefByKind: Record<string, string> = {
  announcement: "/portal",
  achievement: "/portal/achievements",
  friend: "/portal/friends",
  shop: "/portal/shop",
  transaction: "/portal/shop",
  report: "/portal/inbox?tab=mail",
  system: "/portal",
};

export function notificationHref(
  notification: NotificationLike,
) {
  if (notification.href) return notification.href;
  if (notification.channel === "mail" || notification.kind === "report") {
    return "/portal/inbox?tab=mail";
  }
  return hrefByKind[notification.kind ?? "system"] ?? "/portal/inbox";
}

export function isActivityNotification(notification: NotificationLike) {
  return (notification.channel ?? "notification") === "notification";
}

export function isMailNotification(notification: NotificationLike) {
  return notification.channel === "mail";
}

export function matchesPlayerRecipient(
  notification: NotificationLike,
  username: string,
  email: string,
  playerId: string,
) {
  if (notification.target?.kind === "players") {
    return (notification.target.playerIds ?? []).some(
      (id) => id === playerId || id.toLowerCase() === username.toLowerCase(),
    );
  }
  if (notification.recipientUsername) {
    return notification.recipientUsername.toLowerCase() === username.toLowerCase();
  }
  if (notification.recipientEmail) {
    return notification.recipientEmail.toLowerCase() === email.toLowerCase();
  }
  return true;
}

export function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.round(hours / 24);
  if (days < 7) return days + "d ago";
  return new Date(iso).toLocaleDateString();
}
