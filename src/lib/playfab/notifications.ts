import { getUserData } from "./player";
import { PLAYFAB_DATA_KEYS } from "./constants";
import type { PlayerNotification } from "./types";
import { isPlayerAccountNotification } from "@/lib/demo/inbox";

function normalizeNotification(item: Record<string, unknown>): PlayerNotification | null {
  const id = item["id"];
  const title = item["title"];
  const body = item["body"];
  const message = item["message"];
  const kind = item["kind"];
  const type = item["type"];
  const channel = item["channel"];
  const createdAt = item["createdAt"];
  const href = item["href"];
  const target = item["target"];
  const senderUsername = item["senderUsername"];
  const recipientUsername = item["recipientUsername"];
  if (typeof id !== "string") return null;
  return {
    id,
    title: typeof title === "string" ? title : "Crew update",
    body: typeof body === "string" ? body : typeof message === "string" ? message : "",
    kind: typeof kind === "string" ? kind : typeof type === "string" ? type : "system",
    channel: channel === "mail" ? "mail" : "notification",
    read: Boolean(item["read"]),
    createdAt: typeof createdAt === "string" ? createdAt : new Date().toISOString(),
    href: typeof href === "string" ? href : undefined,
    target:
      target && typeof target === "object" ? (target as PlayerNotification["target"]) : undefined,
    senderUsername: typeof senderUsername === "string" ? senderUsername : undefined,
    recipientUsername: typeof recipientUsername === "string" ? recipientUsername : undefined,
  };
}

/** Read player notifications persisted in PlayFab User Data plus real admin broadcasts. */
export async function getNotifications(sessionTicket: string): Promise<PlayerNotification[]> {
  try {
    const data = await getUserData(sessionTicket, [PLAYFAB_DATA_KEYS.notifications]);
    const raw = data[PLAYFAB_DATA_KEYS.notifications];
    const personal = raw ? JSON.parse(raw) : [];
    const personalNotifications = Array.isArray(personal)
      ? personal
          .filter(
            (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
          )
          .map(normalizeNotification)
          .filter((item): item is PlayerNotification => Boolean(item))
      : [];

    let broadcasts: PlayerNotification[] = [];
    if (typeof window !== "undefined") {
      try {
        const response = await fetch("/api/notifications", { credentials: "include" });
        if (response.ok) {
          const body = (await response.json()) as { data?: unknown[] };
          broadcasts = (body.data ?? [])
            .filter(
              (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
            )
            .map(normalizeNotification)
            .filter((item): item is PlayerNotification => Boolean(item));
        }
      } catch {
        // PlayFab User Data remains the source if the website broadcast endpoint is unavailable.
      }
    }

    const byId = new Map<string, PlayerNotification>();
    for (const notification of [...personalNotifications, ...broadcasts]) {
      byId.set(notification.id, notification);
    }
    return [...byId.values()]
      .filter(isPlayerAccountNotification)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}
