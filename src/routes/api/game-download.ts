import { createFileRoute } from "@tanstack/react-router";
import { getInstallerDownloadUrl } from "@/lib/game-download";
import { recordGameDownload, type GameDownloadSource } from "@/lib/game-download-tracking";
import { getWebsiteValue } from "@/lib/playfab/websiteData";

type GameBuild = { downloadUrl?: string; installerFileName?: string };

export const Route = createFileRoute("/api/game-download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secretKey = process.env["PLAYFAB_SECRET_KEY"];
        if (!secretKey) return new Response("Game download is unavailable.", { status: 503 });

        const build = await getWebsiteValue<GameBuild | GameBuild[]>("website_admin_game_build", secretKey);
        const currentBuild = Array.isArray(build) ? build[0] : build;
        const destination = getInstallerDownloadUrl(currentBuild?.downloadUrl);
        if (!destination || destination === "#" || destination.startsWith("mock-installer://")) {
          return new Response("No published game installer is available.", { status: 404 });
        }

        const requestUrl = new URL(request.url);
        const source: GameDownloadSource = requestUrl.searchParams.get("source") === "player" ? "player" : "public";
        const target = new URL(destination, requestUrl);
        if (target.protocol !== "https:" && target.origin !== requestUrl.origin) {
          return new Response("The configured game download URL is invalid.", { status: 400 });
        }

        // The installer proxy records only after it has fetched a valid package.
        if (target.pathname === "/api/game-installer" && target.origin === requestUrl.origin) {
          target.searchParams.set("source", source);
        } else {
          // Third-party hosts do not expose transfer completion, so record the
          // successful redirect request that starts the browser download.
          try {
            await recordGameDownload(source);
          } catch (error) {
            console.error("[API] game download could not be recorded:", error);
          }
        }
        return Response.redirect(target.toString(), 302);
      },
    },
  },
});
