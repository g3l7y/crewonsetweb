import { createFileRoute } from "@tanstack/react-router";
import { isMockMode } from "@/lib/playfab/config";
import { getWebsiteRecords } from "@/lib/playfab/websiteData";
import { recordBrandUpdateEvent } from "@/lib/brand-update-tracking";

export const Route = createFileRoute("/api/brand-updates/$id/click")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const secret = process.env["PLAYFAB_SECRET_KEY"]?.trim();
        if (!secret) return new Response("Brand link is unavailable.", { status: 503 });
        try {
          const updates = await getWebsiteRecords<{ id: string; url: string }>(
            "website_admin_brand_updates",
            secret,
          );
          const update = updates.find((entry) => entry.id === params.id);
          if (!update) return new Response("Brand update not found.", { status: 404 });
          if (!isMockMode()) {
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
            await recordBrandUpdateEvent(update.id, visitor, "click");
            const headers = new Headers({ Location: update.url, "Cache-Control": "no-store" });
            if (!existing)
              headers.append(
                "Set-Cookie",
                `cos_brand_update_visitor=${encodeURIComponent(visitor)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
              );
            return new Response(null, { status: 302, headers });
          }
          return Response.redirect(update.url, 302);
        } catch (error) {
          console.error("[Brand update] Click tracking failed", error);
          return new Response("Brand link tracking is temporarily unavailable.", { status: 503 });
        }
      },
    },
  },
});
