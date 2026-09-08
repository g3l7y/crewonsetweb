import { createFileRoute } from "@tanstack/react-router";

import { ADMIN_COOKIE, PLAYER_COOKIE } from "@/lib/session.constants";

function expired(name: string) {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export const Route = createFileRoute("/api/admin/logout")({
  server: {
    handlers: {
      POST: async () => {
        const headers = new Headers({ "content-type": "application/json" });
        headers.append("set-cookie", expired(ADMIN_COOKIE));
        headers.append("set-cookie", expired(PLAYER_COOKIE));
        return new Response(JSON.stringify({ success: true }), { headers });
      },
    },
  },
});
