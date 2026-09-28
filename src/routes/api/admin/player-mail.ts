import { createFileRoute } from "@tanstack/react-router";
import { persistAdminPlayerMessage } from "@/lib/playfab/admin-player-message";
import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";

type PlayFabAccountInfo = {
  PlayFabId?: string;
  Username?: string;
  TitleInfo?: { DisplayName?: string };
  AccountInfo?: PlayFabAccountInfo;
};

type PlayFabLookupResult = {
  code?: number;
  errorMessage?: string;
  data?: {
    UserInfo?: PlayFabAccountInfo;
    AccountInfo?: PlayFabAccountInfo;
  };
};

export const Route = createFileRoute("/api/admin/player-mail")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }

        const secretKey = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secretKey) return Response.json({ error: "Player messaging is not configured." }, { status: 503 });

        try {
          const body = (await request.json()) as {
            recipientPlayerId?: unknown;
            subject?: unknown;
            body?: unknown;
          };
          const recipientPlayerId =
            typeof body.recipientPlayerId === "string" ? body.recipientPlayerId.trim() : "";
          const subject = typeof body.subject === "string" ? body.subject.trim() : "";
          const messageBody = typeof body.body === "string" ? body.body.trim() : "";
          if (!recipientPlayerId || !subject || !messageBody) {
            return Response.json({ error: "A player, subject, and message are required." }, { status: 400 });
          }
          if (subject.length > 120 || messageBody.length > 4000) {
            return Response.json({ error: "The subject or message is too long." }, { status: 400 });
          }

          const lookupResponse = await fetch(PLAYFAB_API_BASE + "/Admin/GetUserAccountInfo", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
            body: JSON.stringify({ PlayFabId: recipientPlayerId, TitleId: PLAYFAB_TITLE_ID }),
          });
          const lookup = (await lookupResponse.json().catch(() => ({}))) as PlayFabLookupResult;
          const rawAccount = lookup.data?.UserInfo ?? lookup.data?.AccountInfo;
          const account = rawAccount?.AccountInfo ?? rawAccount;
          const resolvedPlayerId = account?.PlayFabId?.trim() ?? "";
          if (!lookupResponse.ok || lookup.code !== 200 || resolvedPlayerId !== recipientPlayerId) {
            return Response.json({ error: "The selected player account could not be verified." }, { status: 404 });
          }

          const recipientUsername =
            account?.Username?.trim() || account?.TitleInfo?.DisplayName?.trim() || "Player";
          const id = "admin-mail-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
          const saved = await persistAdminPlayerMessage({
            id,
            subject,
            body: messageBody,
            recipientPlayerId,
            recipientUsername,
            kind: "system",
            secretKey,
          });
          return saved
            ? Response.json({ success: true, id }, { status: 201 })
            : Response.json({ error: "The message could not be saved." }, { status: 500 });
        } catch (error) {
          console.error("[API] POST admin player-mail error:", error);
          return Response.json({ error: "The message could not be sent." }, { status: 500 });
        }
      },
    },
  },
});
