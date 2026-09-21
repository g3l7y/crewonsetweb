import { createFileRoute } from '@tanstack/react-router';
import { addFriend } from '@/lib/playfab/friends';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';

export const Route = createFileRoute('/api/playfab/friends/add')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request);
        if (!session?.sessionTicket) {
          return unauthorizedSessionResponse(401);
        }

        const body = (await request.json()) as { friendPlayFabId?: string };
        const friendPlayFabId = body.friendPlayFabId?.trim() ?? '';
        if (!friendPlayFabId || friendPlayFabId === session.playFabId) {
          return Response.json({ success: false, error: 'A different player is required.' }, { status: 400 });
        }

        const success = await addFriend(session.sessionTicket, friendPlayFabId);
        return Response.json(
          { success },
          { status: success ? 200 : 400 },
        );
      },
    },
  },
});
