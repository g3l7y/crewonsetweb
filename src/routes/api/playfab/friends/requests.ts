import { createFileRoute } from "@tanstack/react-router";
import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { getWebsiteRecords, setWebsiteRecords, WEBSITE_DATA_KEYS } from "@/lib/playfab/websiteData";
import type { PlayerFriendRequest } from "@/lib/playfab/types";

type FriendActivity = {
  id: string;
  title: string;
  body: string;
  kind: "friend";
  channel: "notification";
  read: boolean;
  createdAt: string;
  href: string;
  recipientUsername: string;
  target: { kind: "players"; playerIds: string[] };
};

type RequestAction = "accept" | "decline" | "cancel";

async function addFriendForPlayer(
  playFabId: string,
  friendPlayFabId: string,
  secretKey: string,
): Promise<boolean> {
  const response = await fetch(PLAYFAB_API_BASE + "/Server/AddFriend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SecretKey": secretKey,
    },
    body: JSON.stringify({
      TitleId: PLAYFAB_TITLE_ID,
      PlayFabId: playFabId,
      FriendPlayFabId: friendPlayFabId,
    }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    code?: number;
    error?: string;
    errorCode?: number;
  };
  return (
    (response.ok && result.code === 200) ||
    result.error === "UsersAlreadyFriends" ||
    result.errorCode === 1183
  );
}

export const Route = createFileRoute("/api/playfab/friends/requests")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || session.role !== "player") {
          return unauthorizedSessionResponse(401);
        }
        const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secretKey) {
          return Response.json({ error: "Friend requests are temporarily unavailable." }, { status: 503 });
        }
        const records = await getWebsiteRecords<PlayerFriendRequest>(
          WEBSITE_DATA_KEYS.playerFriendRequests,
          secretKey,
        );
        return Response.json({
          incoming: records.filter(
            (record) =>
              record.status === "pending" && record.recipientPlayFabId === session.playFabId,
          ),
          outgoing: records.filter(
            (record) =>
              record.status === "pending" && record.senderPlayFabId === session.playFabId,
          ),
        });
      },
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket || session.role !== "player") {
          return unauthorizedSessionResponse(401);
        }
        const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secretKey) {
          return Response.json({ error: "Friend requests are temporarily unavailable." }, { status: 503 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          requestId?: string;
          action?: RequestAction;
        };
        const requestId = body.requestId?.trim() ?? "";
        const action = body.action;
        if (!requestId || !action || !["accept", "decline", "cancel"].includes(action)) {
          return Response.json({ error: "A valid friend request action is required." }, { status: 400 });
        }

        const records = await getWebsiteRecords<PlayerFriendRequest>(
          WEBSITE_DATA_KEYS.playerFriendRequests,
          secretKey,
        );
        const recordIndex = records.findIndex((record) => record.id === requestId);
        const record = records[recordIndex];
        if (!record || record.status !== "pending") {
          return Response.json({ error: "This friend request is no longer pending." }, { status: 409 });
        }
        const isRecipient = record.recipientPlayFabId === session.playFabId;
        const isSender = record.senderPlayFabId === session.playFabId;
        if ((action === "accept" || action === "decline") && !isRecipient) {
          return unauthorizedSessionResponse(403);
        }
        if (action === "cancel" && !isSender) {
          return unauthorizedSessionResponse(403);
        }

        if (action === "accept") {
          const [recipientAdded, senderAdded] = await Promise.all([
            addFriendForPlayer(record.recipientPlayFabId, record.senderPlayFabId, secretKey),
            addFriendForPlayer(record.senderPlayFabId, record.recipientPlayFabId, secretKey),
          ]);
          if (!recipientAdded || !senderAdded) {
            return Response.json(
              { error: "The friendship could not be confirmed. Please try again." },
              { status: 502 },
            );
          }
        }

        const nextRecords = [...records];
        nextRecords[recordIndex] = {
          ...record,
          status: action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled",
        };
        const saved = await setWebsiteRecords(
          WEBSITE_DATA_KEYS.playerFriendRequests,
          nextRecords,
          secretKey,
        );
        if (!saved) {
          return Response.json({ error: "The friend request could not be updated." }, { status: 503 });
        }

        if (action === "accept") {
          const createdAt = new Date().toISOString();
          const eventId = "friend-accepted-" + record.id;
          const notifications: FriendActivity[] = [
            {
              id: eventId + "-recipient",
              title: "Friend request accepted",
              body: "You accepted " + record.senderUsername + "'s friend request.",
              kind: "friend",
              channel: "notification",
              read: false,
              createdAt,
              href: "/portal/friends",
              recipientUsername: record.recipientUsername,
              target: { kind: "players", playerIds: [record.recipientPlayFabId] },
            },
            {
              id: eventId + "-sender",
              title: "Friend request accepted",
              body: record.recipientUsername + " accepted your friend request.",
              kind: "friend",
              channel: "notification",
              read: false,
              createdAt,
              href: "/portal/friends",
              recipientUsername: record.senderUsername,
              target: { kind: "players", playerIds: [record.senderPlayFabId] },
            },
          ];
          const existing = await getWebsiteRecords<FriendActivity>(
            WEBSITE_DATA_KEYS.playerNotifications,
            secretKey,
          );
          await setWebsiteRecords(
            WEBSITE_DATA_KEYS.playerNotifications,
            [...notifications, ...existing],
            secretKey,
          );
        }

        return Response.json({ success: true, status: nextRecords[recordIndex].status });
      },
    },
  },
});
