import { createFileRoute } from "@tanstack/react-router";
import { getFriendsList } from "@/lib/playfab/friends";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { getWebsiteRecords, setWebsiteRecords } from "@/lib/playfab/websiteData";
import type { PlayerMailMessage } from "@/lib/playfab/types";

type MailRecord = {
  id: string;
  title: string;
  body: string;
  kind: "friend" | "admin" | "report" | "system";
  channel: "mail";
  read: boolean;
  createdAt: string;
  href: string;
  threadId: string;
  senderUsername: string;
  recipientUsername: string;
  target: { kind: "players"; playerIds: string[] };
  adminMessage?: boolean;
};

function getSecretKey(): string | null {
  return process.env["PLAYFAB_SECRET_KEY"] || null;
}

export const Route = createFileRoute("/api/mail")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        const secretKey = getSecretKey();
        if (!session || session.role !== "player" || !secretKey) {
          return Response.json({ error: "Unauthorized" }, { status: 403 });
        }
        try {
          const records = await getWebsiteRecords<MailRecord>("website_player_mail", secretKey);
          const username = (session.username || session.displayName || "").toLowerCase();
          const data: PlayerMailMessage[] = records
            .filter((record) => {
              if (!record || typeof record !== "object" || record.channel !== "mail") return false;
              if (record.target?.kind === "players") {
                return record.target.playerIds.includes(session.playFabId);
              }
              return record.recipientUsername?.toLowerCase() === username;
            })
            .map((record) => {
              const adminMessage =
                record.adminMessage === true ||
                record.senderUsername?.trim().toLowerCase() === "administrator" ||
                record.href?.toLowerCase().includes("contact=admin") === true;
              return {
                id: record.id,
                threadId:
                  record.threadId ||
                  (adminMessage ? `admin-${session.playFabId}` : `thread-${record.senderUsername}`),
                subject: record.title || "Message",
                body: record.body || "",
                senderUsername: adminMessage
                  ? "ADMINISTRATOR"
                  : record.senderUsername || "Crew Member",
                recipientUsername:
                  record.recipientUsername || session.username || session.displayName || "Player",
                createdAt: record.createdAt,
                read: Boolean(record.read),
                kind:
                  adminMessage || record.kind === "report" || record.kind === "system"
                    ? ("admin" as const)
                    : ("friend" as const),
                adminMessage,
              };
            })
            .sort(
              (left, right) =>
                new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            );
          return Response.json({ success: true, data });
        } catch (error) {
          console.error("[API] GET mail error:", error);
          return Response.json({ error: "Failed to load mail." }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        const secretKey = getSecretKey();
        if (!session || !secretKey || !session.sessionTicket) {
          return Response.json({ error: "Real mail storage is unavailable." }, { status: 503 });
        }

        try {
          const body = (await request.json()) as {
            recipientPlayerId?: unknown;
            subject?: unknown;
            body?: unknown;
          };
          const recipientPlayerId =
            typeof body.recipientPlayerId === "string" ? body.recipientPlayerId.trim() : "";
          const messageBody = typeof body.body === "string" ? body.body.trim() : "";
          const senderUsername = session.username || session.displayName || "Player";
          const subject =
            typeof body.subject === "string" && body.subject.trim()
              ? body.subject.trim().slice(0, 120)
              : `Message from ${senderUsername}`;

          if (!recipientPlayerId || !messageBody) {
            return Response.json(
              { error: "A recipient and message are required." },
              { status: 400 },
            );
          }
          if (messageBody.length > 4000) {
            return Response.json({ error: "Message is too long." }, { status: 400 });
          }
          if (recipientPlayerId === session.playFabId) {
            return Response.json({ error: "You cannot message yourself." }, { status: 400 });
          }

          const friends = await getFriendsList(session.sessionTicket);
          const friend = friends.find((item) => item.playFabId === recipientPlayerId);
          if (!friend) {
            return Response.json(
              { error: "Messages can only be sent to confirmed friends." },
              { status: 403 },
            );
          }

          const recipientUsername = friend.username || friend.displayName || "Crew Member";
          const messageId = `friend-mail-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          const createdAt = new Date().toISOString();
          const threadId = `thread-${[session.playFabId, recipientPlayerId].sort().join("-")}`;
          const common = {
            title: subject,
            body: messageBody,
            kind: "friend" as const,
            channel: "mail" as const,
            createdAt,
            href: "/portal/inbox?tab=mail",
            threadId,
            senderUsername,
            recipientUsername,
          };

          const records =
            (await getWebsiteRecords<MailRecord>("website_player_mail", secretKey)) ?? [];
          const next: MailRecord[] = [
            {
              id: `${messageId}-sender`,
              ...common,
              read: true,
              target: { kind: "players", playerIds: [session.playFabId] },
            },
            {
              id: `${messageId}-recipient`,
              ...common,
              read: false,
              target: { kind: "players", playerIds: [recipientPlayerId] },
            },
            ...records,
          ];

          const success = await setWebsiteRecords("website_player_mail", next, secretKey);
          return success
            ? Response.json({ success: true, id: messageId }, { status: 201 })
            : Response.json({ error: "Failed to save the message." }, { status: 500 });
        } catch (error) {
          console.error("[API] POST mail error:", error);
          return Response.json({ error: "Failed to send the message." }, { status: 500 });
        }
      },
    },
  },
});
