import { createFileRoute } from "@tanstack/react-router";
import { isMockMode, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";
import { createSessionCookies } from "@/lib/playfab/session";
import type { SessionData, AuthResponse } from "@/lib/playfab/types";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            email?: string;
            username?: string;
            password?: string;
            scope?: "player" | "admin";
          };

          const email = (body.email || body.username || "").trim();
          const password = body.password || "";
          const scope = body.scope;

          if (!email || !password) {
            return Response.json(
              { success: false, error: "Email and password are required." } satisfies AuthResponse,
              { status: 400 },
            );
          }

          let session: SessionData;

          if (isMockMode()) {
            // Mock mode: accept demo credentials
            const isAdmin =
              (email === "admin@crewonset.com" || email === "admin") && password === "admin";
            const isPlayer =
              (email === "player@crewonset.com" ||
                email === "player@gmail.com" ||
                email === "player") &&
              password === "player";

            if (!isAdmin && !isPlayer) {
              return Response.json(
                { success: false, error: "Invalid email or password." } satisfies AuthResponse,
                { status: 401 },
              );
            }

            if (scope === "admin" && !isAdmin) {
              return Response.json(
                {
                  success: false,
                  error: "Access denied: Admin privileges required.",
                } satisfies AuthResponse,
                { status: 403 },
              );
            }

            const role = isAdmin ? "admin" : "player";
            session = {
              playFabId: isAdmin ? "MOCK-ADMIN-001" : "MOCK-PLAYER-001",
              sessionTicket: isAdmin ? "mock-admin-ticket" : "mock-player-ticket",
              role,
              displayName: isAdmin ? "ADMIN" : "CAMERA_PRO",
              email: isAdmin ? "admin@crewonset.com" : "player@crewonset.com",
            };
          } else {
            // Real mode: call PlayFab LoginWithEmailAddress
            const titleId = PLAYFAB_TITLE_ID || "D4EA4";
            const playfabResponse = await fetch(
              `https://${titleId}.playfabapi.com/Client/LoginWithEmailAddress`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  TitleId: titleId,
                  Email: email,
                  Password: password,
                  InfoRequestParameters: {
                    GetPlayerProfile: true,
                    GetUserAccountInfo: true,
                  },
                }),
              },
            );

            const pfResult = await playfabResponse.json();

            if (!playfabResponse.ok || pfResult.code !== 200) {
              return Response.json(
                {
                  success: false,
                  error: pfResult.errorMessage ?? "Invalid email or password.",
                } satisfies AuthResponse,
                { status: 401 },
              );
            }

            const pfData = pfResult.data;
            const playFabId = pfData.PlayFabId;
            const sessionTicket = pfData.SessionTicket;
            const displayName =
              pfData.InfoResultPayload?.PlayerProfile?.DisplayName ??
              pfData.InfoResultPayload?.AccountInfo?.TitleInfo?.DisplayName ??
              email.split("@")[0];

            // Determine admin role server-side via PlayFab admin tags
            let role: "admin" | "player" = "player";
            const secretKey = process.env["PLAYFAB_SECRET_KEY"];

            // If scope is explicitly admin, secret key is required to verify admin tags
            if (scope === "admin" && !secretKey) {
              return Response.json(
                {
                  success: false,
                  error:
                    "Server configuration error: PLAYFAB_SECRET_KEY is required for admin authorization.",
                } satisfies AuthResponse,
                { status: 500 },
              );
            }

            if (secretKey) {
              try {
                const tagsResponse = await fetch(
                  `https://${titleId}.playfabapi.com/Server/GetPlayerTags`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-SecretKey": secretKey,
                    },
                    body: JSON.stringify({ PlayFabId: playFabId }),
                  },
                );
                const tagsResult = await tagsResponse.json();
                if (tagsResult.code === 200) {
                  const tags: string[] = tagsResult.data?.Tags ?? [];
                  if (tags.some((t: string) => t.toLowerCase() === "role:admin")) {
                    role = "admin";
                  }
                }
              } catch (e) {
                console.warn("[PlayFab] Could not fetch player tags for admin check:", e);
              }
            }

            if (scope === "admin" && role !== "admin") {
              return Response.json(
                {
                  success: false,
                  error: "Access denied: This account does not have studio admin privileges.",
                } satisfies AuthResponse,
                { status: 403 },
              );
            }

            session = {
              playFabId,
              sessionTicket,
              role,
              displayName,
              email,
            };
          }

          // Set cookies
          const headers = new Headers({ "Content-Type": "application/json" });
          for (const cookie of createSessionCookies(session)) {
            headers.append("Set-Cookie", cookie);
          }

          const response: AuthResponse = {
            success: true,
            session: {
              playFabId: session.playFabId,
              role: session.role,
              displayName: session.displayName,
              email: session.email,
            },
            destination: session.role === "admin" ? "/admin" : "/portal",
          };

          return new Response(JSON.stringify(response), { headers });
        } catch (error) {
          console.error("[Auth] Login error:", error);
          return Response.json(
            { success: false, error: "An unexpected error occurred." } satisfies AuthResponse,
            { status: 500 },
          );
        }
      },
    },
  },
});
