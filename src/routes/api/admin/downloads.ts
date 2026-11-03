import { createFileRoute } from "@tanstack/react-router";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { getGameDownloadCount } from "@/lib/game-download-tracking";

export const Route = createFileRoute("/api/admin/downloads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const totalDownloads = await getGameDownloadCount();
          return Response.json({
            success: true,
            configured: totalDownloads !== null,
            totalDownloads,
          });
        } catch (error) {
          console.error("[API] game download metrics could not be loaded:", error);
          return Response.json({ success: false, error: "Download metrics could not be loaded." }, { status: 503 });
        }
      },
    },
  },
});
