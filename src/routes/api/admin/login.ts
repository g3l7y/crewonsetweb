import { createFileRoute } from "@tanstack/react-router";

import {
  ADMIN_COOKIE,
  ADMIN_SESSION,
  PLAYER_COOKIE,
  PLAYER_SESSION,
} from "@/lib/session.constants";

function cookie(name: string, value: string, maxAge: number) {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export const Route = createFileRoute("/api/admin/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { username, password, scope } = (await request.json()) as {
          username?: string;
          password?: string;
          scope?: "player" | "admin";
        };

        // The scope is decided by which login surface issued the request. The
        // public/player form never sends scope "admin", so it can never mint an
        // admin session even if admin credentials are entered.
        const wantsAdmin = scope === "admin";
        const isAdmin = wantsAdmin && username === "admin" && password === "admin";
        const isPlayer =
          !wantsAdmin && username === "player@gmail.com" && password === "player";

        if (!isAdmin && !isPlayer) {
          return Response.json({ error: "Invalid email or password." }, { status: 401 });
        }

        const headers = new Headers({ "content-type": "application/json" });
        headers.append(
          "set-cookie",
          cookie(
            isAdmin ? ADMIN_COOKIE : PLAYER_COOKIE,
            isAdmin ? ADMIN_SESSION : PLAYER_SESSION,
            60 * 60 * 8,
          ),
        );
        headers.append("set-cookie", cookie(isAdmin ? PLAYER_COOKIE : ADMIN_COOKIE, "", 0));

        return new Response(
          JSON.stringify({ success: true, destination: isAdmin ? "/admin" : "/portal" }),
          { headers },
        );
      },
    },
  },
});
