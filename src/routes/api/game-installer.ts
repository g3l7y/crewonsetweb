import { createFileRoute } from "@tanstack/react-router";
import { getGameInstallerMetadata } from "@/lib/playfab/game-installer-files";

export const Route = createFileRoute("/api/game-installer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const fileName = url.searchParams.get("file") || "";
        const downloadName = (url.searchParams.get("name") || "CrewOnSetInstaller.exe")
          .replace(/[\\/\r\n\0]/g, "_")
          .slice(0, 160);
        const secretKey = process.env["PLAYFAB_SECRET_KEY"];
        if (!secretKey)
          return Response.json({ error: "Installer storage is unavailable." }, { status: 503 });

        try {
          const metadata = await getGameInstallerMetadata(fileName, secretKey);
          if (!metadata?.DownloadUrl)
            return Response.json({ error: "Installer not found." }, { status: 404 });
          const fileResponse = await fetch(metadata.DownloadUrl, { cache: "no-store" });
          if (!fileResponse.ok || !fileResponse.body) {
            return Response.json({ error: "Installer download failed." }, { status: 502 });
          }

          const headers = new Headers({
            "Cache-Control": "public, max-age=60",
            "Content-Disposition": `attachment; filename="CrewOnSetInstaller.exe"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
            "Content-Type": "application/octet-stream",
            "X-Content-Type-Options": "nosniff",
          });
          const contentLength = fileResponse.headers.get("content-length");
          if (contentLength) headers.set("Content-Length", contentLength);
          return new Response(fileResponse.body, { status: 200, headers });
        } catch (error) {
          console.error("[API] installer download error:", error);
          return Response.json({ error: "Installer download failed." }, { status: 502 });
        }
      },
    },
  },
});
