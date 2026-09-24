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
