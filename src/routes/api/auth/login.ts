import { createFileRoute } from "@tanstack/react-router";
import { isMockMode, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";
import { createSessionCookies } from "@/lib/playfab/session";
import { findMockAccount } from "@/lib/playfab/mock-accounts";
import { isValidEmail, isValidUsername } from "@/lib/validation";
import type { SessionData, AuthResponse } from "@/lib/playfab/types";
import { syncPlayFabContactEmail } from "@/lib/playfab/contact-email";

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

          const identifier = (body.email || body.username || "").trim();
          const password = body.password || "";
          const scope = body.scope;

          if (!identifier || !password) {
            return Response.json(
              { success: false, error: "Email and password are required." } satisfies AuthResponse,
              { status: 400 },
            );
          }

          if (!isValidEmail(identifier) && !isValidUsername(identifier) && identifier !== "admin" && identifier !== "player") {
            return Response.json(
              { success: false, error: "Please enter a valid email address or username." } satisfies AuthResponse,
              { status: 400 },
            );
          }

          let session: SessionData;

          if (isMockMode()) {
            const account = findMockAccount(identifier);
            if (!account || account.password !== password) {
              return Response.json(
                { success: false, error: "Invalid email or password." } satisfies AuthResponse,
                { status: 401 },
              );
            }

            if (scope === "player" && account.role === "admin") {
              return Response.json(
                {
                  success: false,
                  error: "Admin accounts must use the admin login portal.",
                } satisfies AuthResponse,
                { status: 403 },
              );
            }

            if (scope === "admin" && account.role !== "admin") {
              return Response.json(
                {
                  success: false,
                  error: "Access denied: Admin privileges required.",
                } satisfies AuthResponse,
                { status: 403 },
              );
            }

            session = account;
          } else {
            // Real mode: call PlayFab LoginWithEmailAddress
            const titleId = PLAYFAB_TITLE_ID || "D4EA4";
            const loginWithUsername = !isValidEmail(identifier);
            const playfabResponse = await fetch(
              `https://${titleId}.playfabapi.com/Client/${loginWithUsername ? "LoginWithPlayFab" : "LoginWithEmailAddress"}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  TitleId: titleId,
                  ...(loginWithUsername ? { Username: identifier } : { Email: identifier }),
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
              identifier.split("@")[0];
            const accountEmail =
              pfData.InfoResultPayload?.AccountInfo?.PrivateInfo?.Email ??
              (isValidEmail(identifier) ? identifier : "");

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

            if (scope === "player" && role === "admin") {
              return Response.json(
                {
                  success: false,
                  error: "Admin accounts must use the admin login portal.",
                } satisfies AuthResponse,
                { status: 403 },
              );
            }

            session = {
              playFabId,
              sessionTicket,
              role,
              username: pfData.InfoResultPayload?.PlayerProfile?.DisplayName ??
                pfData.InfoResultPayload?.AccountInfo?.Username ??
                displayName,
              displayName,
              email: accountEmail,
            };

            if (accountEmail) {
              try {
                await syncPlayFabContactEmail(sessionTicket, accountEmail);
              } catch (contactEmailError) {
                console.warn("[PlayFab] Could not sync login contact email:", contactEmailError);
              }
            }
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
              username: session.username || session.displayName,
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
