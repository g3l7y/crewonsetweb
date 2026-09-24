import { createFileRoute } from "@tanstack/react-router";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { PLAYFAB_DATA_KEYS } from "@/lib/playfab/constants";
import { getUserData, updateUserData } from "@/lib/playfab/player";
import { getWebsiteRecords, setWebsiteRecords, WEBSITE_DATA_KEYS } from "@/lib/playfab/websiteData";
import type { SessionData } from "@/lib/playfab/types";

const NOTIFICATION_COLLECTIONS = [
  WEBSITE_DATA_KEYS.notifications,
  WEBSITE_DATA_KEYS.playerMail,
  WEBSITE_DATA_KEYS.playerNotifications,
] as const;

type NotificationRecord = { id: string };

function getSecretKey(): string | null {
  return process.env["PLAYFAB_SECRET_KEY"] || null;
}

async function readAllNotifications(secretKey: string): Promise<NotificationRecord[]> {
  const collections = await Promise.all(
    NOTIFICATION_COLLECTIONS.map((key) => getWebsiteRecords<NotificationRecord>(key, secretKey)),
  );
  return collections.flat();
}

function belongsToSession(item: NotificationRecord, session: SessionData): boolean {
  const record = item as NotificationRecord & {
    target?: { kind?: string; playerIds?: string[] };
    recipientUsername?: string;
    recipientEmail?: string;
  };
  if (record.target?.kind === "all") return false;
  if (record.target?.kind === "players") {
    return Boolean(record.target.playerIds?.includes(session.playFabId));
  }
  if (record.recipientUsername) {
    return record.recipientUsername.toLowerCase() === session.username?.toLowerCase();
  }
  if (record.recipientEmail && session.email) {
    return record.recipientEmail.toLowerCase() === session.email.toLowerCase();
  }
  return false;
}

export const Route = createFileRoute("/api/notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        const secretKey = getSecretKey();
        if (!session || session.role !== "player" || !secretKey) {
          return Response.json({ error: "Unauthorized" }, { status: 403 });
        }
        try {
          const body = (await request.json()) as {
            kind?: unknown;
            title?: unknown;
            body?: unknown;
          };
          const kind = typeof body.kind === "string" ? body.kind.toLowerCase() : "";
          if (!["friend", "shop", "transaction"].includes(kind)) {
            return Response.json({ error: "Unsupported player activity." }, { status: 400 });
          }
          const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
          const message = typeof body.body === "string" ? body.body.trim().slice(0, 1000) : "";
          if (!title || !message) {
            return Response.json({ error: "A title and message are required." }, { status: 400 });
          }

          const username = session.username || session.displayName || "Player";
          const record: NotificationRecord & Record<string, unknown> = {
            id: `player-${kind}-${session.playFabId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title,
            body: message,
            kind,
            channel: "notification",
            read: false,
            createdAt: new Date().toISOString(),
            recipientUsername: username,
            target: { kind: "players", playerIds: [session.playFabId] },
            href: kind === "shop" || kind === "transaction" ? "/portal/shop" : "/portal/friends",
          };
          const records = await getWebsiteRecords<NotificationRecord>(
            WEBSITE_DATA_KEYS.playerNotifications,
            secretKey,
          );
          const success = await setWebsiteRecords(
            WEBSITE_DATA_KEYS.playerNotifications,
            [record, ...records.filter((item) => item.id !== record.id)],
            secretKey,
          );
          return success
            ? Response.json({ success: true, data: record }, { status: 201 })
            : Response.json({ error: "Failed to save activity." }, { status: 500 });
        } catch (error) {
          console.error("[API] POST notifications error:", error);
          return Response.json({ error: "Failed to save activity." }, { status: 500 });
        }
      },
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        const secretKey = getSecretKey();
        if (!session || session.role !== "player" || !secretKey)
          return Response.json({ success: true, data: [] });

        const records = await readAllNotifications(secretKey);
        const data = records
          .filter((item) => item && typeof item === "object")
          .filter((item) => belongsToSession(item, session))
          .sort((a, b) => {
            const left = new Date(String((a as { createdAt?: string }).createdAt ?? 0)).getTime();
            const right = new Date(String((b as { createdAt?: string }).createdAt ?? 0)).getTime();
            return right - left;
          });

        return Response.json({ success: true, data });
      },

      PATCH: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        const secretKey = getSecretKey();
        const sessionTicket = session?.sessionTicket;
        if (!session || session.role !== "player" || !secretKey || !sessionTicket)
          return Response.json({ error: "Unauthorized" }, { status: 403 });

        try {
          const body = (await request.json()) as { ids?: string[] };
          const ids = new Set(body.ids ?? []);
          if (!ids.size)
            return Response.json({ error: "Notification IDs are required." }, { status: 400 });

          let changedAny = false;
          for (const collectionKey of NOTIFICATION_COLLECTIONS) {
            const records = await getWebsiteRecords<NotificationRecord>(collectionKey, secretKey);
            let changed = false;
            const next = records.map((item) => {
              if (!item || typeof item !== "object") return item;
              const record = item as NotificationRecord & {
                read?: boolean;
              };
              if (!record.id || !ids.has(record.id) || !belongsToSession(item, session))
                return item;
              changed = true;
              return { ...record, read: true };
            });
            if (changed) {
              const success = await setWebsiteRecords(collectionKey, next, secretKey);
              if (!success)
                return Response.json(
                  { error: "Failed to save notification state." },
                  { status: 500 },
                );
              changedAny = true;
            }
          }

          const personalData = await getUserData(sessionTicket, [PLAYFAB_DATA_KEYS.notifications]);
          const personalRaw = personalData[PLAYFAB_DATA_KEYS.notifications];
          if (personalRaw) {
            let personalItems: unknown = [];
            try {
              personalItems = JSON.parse(personalRaw);
            } catch {
              personalItems = [];
            }
            if (Array.isArray(personalItems)) {
              let changedPersonal = false;
              const nextPersonal = personalItems.map((item) => {
                if (!item || typeof item !== "object") return item;
                const record = item as { id?: string; read?: boolean };
                if (!record.id || !ids.has(record.id) || record.read === true) return item;
                changedPersonal = true;
                return { ...record, read: true };
              });
              if (changedPersonal) {
                const saved = await updateUserData(sessionTicket, {
                  [PLAYFAB_DATA_KEYS.notifications]: JSON.stringify(nextPersonal),
                });
                if (!saved)
                  return Response.json(
                    { error: "Failed to save notification state." },
                    { status: 500 },
                  );
                changedAny = true;
              }
            }
          }

          return Response.json({ success: true, changed: changedAny });
        } catch (error) {
          console.error("[API] PATCH notifications error:", error);
          return Response.json({ error: "Failed to save notification state." }, { status: 500 });
        }
      },
    },
  },
});
