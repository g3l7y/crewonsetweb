import { createFileRoute } from "@tanstack/react-router";
import { addFriend, getFriendsList } from "@/lib/playfab/friends";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { getWebsiteRecords, setWebsiteRecords, WEBSITE_DATA_KEYS } from "@/lib/playfab/websiteData";

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

        const body = (await request.json()) as { friendPlayFabId?: string };
        const friendPlayFabId = body.friendPlayFabId?.trim() ?? "";
        if (!friendPlayFabId || friendPlayFabId === session.playFabId) {
          return Response.json(
            { success: false, error: "A different player is required." },
            { status: 400 },
          );
        }

        const success = await addFriend(session.sessionTicket, friendPlayFabId);
        if (success) {
          const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
          if (secretKey) {
            try {
              const friends = await getFriendsList(session.sessionTicket);
              const friend = friends.find((item) => item.playFabId === friendPlayFabId);
              const friendName = friend?.username || friend?.displayName || "Crew Member";
              const username = session.username || session.displayName || "Player";
              const createdAt = new Date().toISOString();
              const eventId =
                "friend-added-" + session.playFabId + "-" + friendPlayFabId + "-" + Date.now();
              const notifications: FriendActivity[] = [
                {
                  id: eventId,
                  title: "Friend added",
                  body: "You added " + friendName + " to your crew chat.",
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
                  title: "New friend connection",
                  body: username + " added you as a friend.",
                  kind: "friend",
                  channel: "notification",
                  read: false,
                  createdAt,
                  href: "/portal/friends",
                  recipientUsername: friendName,
                  target: { kind: "players", playerIds: [friendPlayFabId] },
                },
              ];
              const existing = await getWebsiteRecords<FriendActivity>(
                WEBSITE_DATA_KEYS.playerNotifications,
                secretKey,
              );
              const saved = await setWebsiteRecords(
                WEBSITE_DATA_KEYS.playerNotifications,
                [...notifications, ...existing],
                secretKey,
              );
              if (!saved) {
                console.warn("[API] Friend added, but activity notifications were not saved.");
              }
            } catch (error) {
              console.warn(
                "[API] Friend added, but activity notifications could not be saved:",
                error,
              );
            }
          }
        }
        return Response.json({ success }, { status: success ? 200 : 400 });
      },
    },
  },
});
