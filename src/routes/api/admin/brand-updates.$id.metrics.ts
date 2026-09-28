import { createFileRoute } from "@tanstack/react-router";
import { validateSessionFromRequest } from "@/lib/playfab/session";
import { getBrandUpdateMetrics } from "@/lib/brand-update-tracking";
import { recordBrandUpdateEvent } from "@/lib/brand-update-tracking";

export const Route = createFileRoute("/api/admin/brand-updates/$id/metrics")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true })))
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          await recordBrandUpdateEvent(params.id, crypto.randomUUID(), "impression");
          return Response.json({ success: true });
        } catch (error) {
          console.error("[Admin brand metrics] Impression record failed", error);
          return Response.json({ error: "Metrics unavailable." }, { status: 503 });
        }
      },
      GET: async ({ request, params }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true })))
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          return Response.json({ success: true, data: await getBrandUpdateMetrics(params.id) });
        } catch (error) {
          console.error("[Admin brand metrics] Read failed", error);
          return Response.json({ error: "Metrics unavailable." }, { status: 503 });
        }
      },
    },
  },
});
