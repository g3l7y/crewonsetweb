import { createFileRoute } from "@tanstack/react-router";
import { getFriendsList } from "@/lib/playfab/friends";
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

export const Route = createFileRoute("/api/playfab/friends/add")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket) {
          return unauthorizedSessionResponse(401);
        }

        const body = (await request.json()) as {
          friendPlayFabId?: string;
          username?: string;
          level?: number;
          role?: string;
        };
        const friendPlayFabId = body.friendPlayFabId?.trim() ?? "";
        if (
          session.role !== "player" ||
          !friendPlayFabId ||
          friendPlayFabId === session.playFabId
        ) {
          return Response.json(
            { success: false, error: "A different player account is required." },
            { status: 400 },
          );
        }

        const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secretKey) {
          return Response.json(
            { success: false, error: "Friend requests are temporarily unavailable." },
            { status: 503 },
          );
        }

        const [requests, currentFriends] = await Promise.all([
          getWebsiteRecords<PlayerFriendRequest>(WEBSITE_DATA_KEYS.playerFriendRequests, secretKey),
          getFriendsList(session.sessionTicket),
        ]);
        if (currentFriends.some((friend) => friend.playFabId === friendPlayFabId)) {
          return Response.json(
            { success: false, error: "You are already friends with this player." },
            { status: 409 },
          );
        }

        const existingOutgoing = requests.find(
          (item) =>
            item.status === "pending" &&
            item.senderPlayFabId === session.playFabId &&
            item.recipientPlayFabId === friendPlayFabId,
        );
        if (existingOutgoing) {
          return Response.json({ success: true, request: existingOutgoing });
        }
        const existingIncoming = requests.find(
          (item) =>
            item.status === "pending" &&
            item.senderPlayFabId === friendPlayFabId &&
            item.recipientPlayFabId === session.playFabId,
        );
        if (existingIncoming) {
          return Response.json(
            { success: false, error: "This player has already sent you a request." },
            { status: 409 },
          );
        }

        const username = (session.username || session.displayName || "Player").slice(0, 32);
        const friendName =
          typeof body.username === "string" && body.username.trim()
            ? body.username.trim().slice(0, 32)
            : "Crew Member";
        const createdAt = new Date().toISOString();
        const requestRecord: PlayerFriendRequest = {
          id: crypto.randomUUID(),
          senderPlayFabId: session.playFabId,
          senderUsername: username,
          senderLevel: 1,
          senderRole: "Crew Member",
          recipientPlayFabId: friendPlayFabId,
          recipientUsername: friendName,
          recipientLevel: Number.isFinite(body.level) ? Math.max(1, Number(body.level)) : 1,
          recipientRole:
            typeof body.role === "string" && body.role.trim()
              ? body.role.trim().slice(0, 48)
              : "Crew Member",
          createdAt,
          status: "pending",
        };
        const savedRequest = await setWebsiteRecords(
          WEBSITE_DATA_KEYS.playerFriendRequests,
          [requestRecord, ...requests],
          secretKey,
        );
        if (!savedRequest) {
          return Response.json(
            { success: false, error: "The friend request could not be saved." },
            { status: 503 },
          );
        }

        const eventId = "friend-request-" + requestRecord.id;
        const notifications: FriendActivity[] = [
          {
            id: eventId,
            title: "Friend request sent",
            body: "You sent a friend request to " + friendName + ".",
            kind: "friend",
            channel: "notification",
            read: false,
            createdAt,
            href: "/portal/friends",
            recipientUsername: username,
            target: { kind: "players", playerIds: [session.playFabId] },
          },
          {
            id: eventId + "-recipient",
            title: "New friend request",
            body: username + " sent you a friend request.",
            kind: "friend",
            channel: "notification",
            read: false,
            createdAt,
            href: "/portal/friends",
            recipientUsername: friendName,
            target: { kind: "players", playerIds: [friendPlayFabId] },
          },
        ];
        try {
          const existing = await getWebsiteRecords<FriendActivity>(
            WEBSITE_DATA_KEYS.playerNotifications,
            secretKey,
          );
          await setWebsiteRecords(
            WEBSITE_DATA_KEYS.playerNotifications,
            [...notifications, ...existing],
            secretKey,
          );
        } catch (error) {
          console.warn("[API] Friend request saved, but activity notifications were not saved.", error);
        }

        return Response.json({ success: true, request: requestRecord });
      },
    },
  },
});
