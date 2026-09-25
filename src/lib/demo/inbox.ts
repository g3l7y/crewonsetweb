export type NotificationLike = {
  id?: string | undefined;
  title?: string | undefined;
  body?: string | undefined;
  kind?: string | undefined;
  href?: string | undefined;
  channel?: "notification" | "mail" | undefined;
  senderUsername?: string | undefined;
  adminMessage?: boolean | undefined;
  createdAt?: string | undefined;
  recipientUsername?: string | undefined;
  recipientEmail?: string | undefined;
  target?: { kind: "all" | "players"; playerIds?: string[] | undefined } | undefined;
};

export type NotificationBellPreferences = {
  productionUpdates?: boolean;
  friendUpdates?: boolean;
  transactions?: boolean;
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

export function notificationHref(notification: NotificationLike) {
  if (isAdminAuthoredNotification(notification)) {
    return "/portal/inbox?tab=mail&contact=admin";
  }
  if (notification.href) return notification.href;
  if (notification.channel === "mail" || notification.kind === "report") {
    return "/portal/inbox?tab=mail";
  }
  return hrefByKind[notification.kind ?? "system"] ?? "/portal/inbox";
}

export function isActivityNotification(notification: NotificationLike) {
  return (notification.channel ?? "notification") === "notification";
}

/** Admin-authored mail alerts belong in the bell and Inbox, not player activity. */
export function isAdminAuthoredNotification(notification: NotificationLike) {
  return (
    notification.adminMessage === true ||
    notification.senderUsername?.trim().toLowerCase() === "administrator" ||
    notification.href?.toLowerCase().includes("contact=admin") === true ||
    notification.title?.trim().toLowerCase() === "new message from administrator"
  );
}

/** Apply notification preferences to the bell only; Inbox and activity feeds stay complete. */
export function isVisibleInNotificationBell(
  notification: NotificationLike,
  preferences: NotificationBellPreferences,
) {
  if (isAdminAuthoredNotification(notification)) return true;

  const kind = notification.kind?.trim().toLowerCase() ?? "";
  const content = `${notification.title ?? ""} ${notification.body ?? ""}`.toLowerCase();
  const productionEvent =
    [
      "achievement",
      "achievement_unlocked",
      "level_complete",
      "level_completed",
      "level_completion",
      "production",
      "production_complete",
      "production_completed",
      "production_completion",
      "production_log",
    ].includes(kind) ||
    (kind === "activity" && /achievement|production|level|completed|finished|unlocked/.test(content));
  if (productionEvent && preferences.productionUpdates === false) return false;

  const friendAcceptance =
    ["friend", "friend_update"].includes(kind) &&
    (/(?:accepted|accepts|approved)\s+(?:your\s+)?(?:friend\s+)?request/.test(content) ||
      /(?:friend\s+)?request\s+(?:was|has been)\s+accepted/.test(content) ||
      /(?:now|officially)\s+friends?\s+with/.test(content));
  if (friendAcceptance && preferences.friendUpdates === false) return false;

  const transactionEvent = [
    "c_coin_topup",
    "ccoin_topup",
    "coin_topup",
    "purchase",
    "shop",
    "shop_purchase",
    "topup",
    "top_up",
    "transaction",
  ].includes(kind);
  if (transactionEvent && preferences.transactions === false) return false;

  return true;
}

/** Dashboard activity is intentionally limited to player social and commerce events. */
export function isRecentPlayerActivity(notification: NotificationLike) {
  if (!isActivityNotification(notification) || isAdminAuthoredNotification(notification)) {
    return false;
  }
  return [
    "achievement",
    "achievement_unlocked",
    "activity",
    "friend",
    "friend_update",
    "level_complete",
    "level_completed",
    "level_completion",
    "production",
    "production_complete",
    "production_completed",
    "production_completion",
    "production_log",
    "purchase",
    "shop",
    "shop_purchase",
    "topup",
    "top_up",
    "transaction",
  ].includes(notification.kind?.toLowerCase() ?? "");
}

/** Remove duplicate records when the same event arrives through multiple feeds. */
export function dedupeNotifications<T extends NotificationLike>(notifications: T[]) {
  const ids = new Set<string>();
  const fingerprints = new Set<string>();
  return notifications.filter((notification) => {
    if (notification.id && ids.has(notification.id)) return false;
    if (notification.id) ids.add(notification.id);

    const fingerprint = [
      notification.kind?.toLowerCase() ?? "",
      notification.title?.trim().toLowerCase() ?? "",
      notification.body?.trim().toLowerCase() ?? "",
      notification.createdAt ?? "",
    ].join("|");
    if (fingerprints.has(fingerprint)) return false;
    fingerprints.add(fingerprint);
    return true;
  });
}

const playerNotificationKinds = new Set([
  "achievement",
  "achievement_unlocked",
  "activity",
  "friend",
  "friend_update",
  "level_complete",
  "level_completed",
  "level_completion",
  "production",
  "production_complete",
  "production_completed",
  "production_completion",
  "production_log",
  "report",
  "purchase",
  "shop",
  "shop_purchase",
  "topup",
  "top_up",
  "transaction",
]);

/** Exclude broadcasts and admin-only events from a player's activity feed. */
export function isPlayerAccountNotification(notification: NotificationLike) {
  if (!isActivityNotification(notification) || notification.target?.kind === "all") return false;
  const kind = notification.kind ?? "";
  if (playerNotificationKinds.has(kind)) return true;
  const explicitlyTargeted =
    notification.target?.kind === "players" ||
    Boolean(notification.recipientUsername) ||
    Boolean(notification.recipientEmail);
  return kind === "system" && explicitlyTargeted;
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
  const explicitlyTargeted = notification.target?.kind === "players";
  if (notification.target?.kind === "players") {
    const targetMatches = (notification.target.playerIds ?? []).some(
      (id) => id === playerId || id.toLowerCase() === username.toLowerCase(),
    );
    if (targetMatches) return true;
  }
  if (notification.recipientUsername) {
    return notification.recipientUsername.toLowerCase() === username.toLowerCase();
  }
  if (notification.recipientEmail) {
    return notification.recipientEmail.toLowerCase() === email.toLowerCase();
  }
  return !explicitlyTargeted;
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
