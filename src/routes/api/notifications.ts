import { createFileRoute } from "@tanstack/react-router";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { getWebsiteRecords, setWebsiteRecords } from "@/lib/playfab/websiteData";

const NOTIFICATION_COLLECTIONS = [
  "website_admin_notifications",
  "website_player_mail",
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

function belongsToSession(
  item: NotificationRecord,
  session: { playFabId: string; username: string },
): boolean {
  const record = item as NotificationRecord & {
    target?: { kind?: string; playerIds?: string[] };
    recipientUsername?: string;
  };
  if (record.target?.kind === "players") {
    return Boolean(record.target.playerIds?.includes(session.playFabId));
  }
  return !record.recipientUsername || record.recipientUsername === session.username;
}

export const Route = createFileRoute("/api/notifications")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        const secretKey = getSecretKey();
        if (!session || !secretKey) return Response.json({ success: true, data: [] });

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
        if (!session || !secretKey) return Response.json({ error: "Unauthorized" }, { status: 403 });

        try {
          const body = (await request.json()) as { ids?: string[] };
          const ids = new Set(body.ids ?? []);
          if (!ids.size) return Response.json({ error: "Notification IDs are required." }, { status: 400 });

          let changedAny = false;
          for (const collectionKey of NOTIFICATION_COLLECTIONS) {
            const records = await getWebsiteRecords<NotificationRecord>(collectionKey, secretKey);
            let changed = false;
            const next = records.map((item) => {
              if (!item || typeof item !== "object") return item;
              const record = item as NotificationRecord & {
                read?: boolean;
              };
              if (!record.id || !ids.has(record.id) || !belongsToSession(item, session)) return item;
              changed = true;
              return { ...record, read: true };
            });
            if (changed) {
              const success = await setWebsiteRecords(collectionKey, next, secretKey);
              if (!success) return Response.json({ error: "Failed to save notification state." }, { status: 500 });
              changedAny = true;
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
