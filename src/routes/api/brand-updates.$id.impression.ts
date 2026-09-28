import { createFileRoute } from "@tanstack/react-router";
import { isMockMode } from "@/lib/playfab/config";
import { recordBrandUpdateEvent } from "@/lib/brand-update-tracking";
import { getWebsiteRecords } from "@/lib/playfab/websiteData";

export const Route = createFileRoute("/api/brand-updates/$id/impression")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (isMockMode()) return Response.json({ success: true });
        const secret = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secret) return Response.json({ error: "Tracking unavailable." }, { status: 503 });
        try {
          const updates = await getWebsiteRecords<{ id: string }>(
            "website_admin_brand_updates",
            secret,
          );
          if (!updates.some((entry) => entry.id === params.id))
            return Response.json({ error: "Not found." }, { status: 404 });
          const cookie = request.headers.get("cookie") ?? "";
          const raw = cookie
            .split(";")
            .map((part) => part.trim())
            .find((part) => part.startsWith("cos_brand_update_visitor="))
            ?.split("=")
            .slice(1)
            .join("=");
          const existing = raw ? decodeURIComponent(raw) : "";
          const visitor = /^[0-9a-f-]{36}$/i.test(existing) ? existing : crypto.randomUUID();
          await recordBrandUpdateEvent(params.id, visitor, "impression");
          const headers = new Headers();
          if (!existing)
            headers.append(
              "Set-Cookie",
              `cos_brand_update_visitor=${encodeURIComponent(visitor)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
            );
          return Response.json({ success: true }, { headers });
        } catch (error) {
          console.error("[Brand update] Impression tracking failed", error);
          return Response.json({ error: "Tracking unavailable." }, { status: 503 });
        }
      },
    },
  },
});
