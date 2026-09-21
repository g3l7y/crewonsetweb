import { createFileRoute } from "@tanstack/react-router";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import { getSubmissionAttachment } from "@/lib/playfab/submission-attachments";

function getSecretKey(): string | null {
  return process.env["PLAYFAB_SECRET_KEY"] || null;
}

export const Route = createFileRoute("/api/admin/submission-attachments")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }

        const secretKey = getSecretKey();
        const fileName = new URL(request.url).searchParams.get("file") || "";
        if (!secretKey || !fileName) {
          return Response.json({ error: "Attachment not found." }, { status: 404 });
        }

        try {
          const metadata = await getSubmissionAttachment(fileName, secretKey);
          if (!metadata?.DownloadUrl) {
            return Response.json({ error: "Attachment not found." }, { status: 404 });
          }

          const download = await fetch(metadata.DownloadUrl);
          if (!download.ok || !download.body) {
            return Response.json({ error: "Attachment could not be downloaded." }, { status: 502 });
          }

          const contentType = download.headers.get("content-type") || "application/octet-stream";
          const safeDownloadName = metadata.FileName.replace(/[^a-z0-9_.()-]/gi, "_");
          return new Response(download.body, {
            headers: {
              "Cache-Control": "private, no-store",
              "Content-Disposition": `inline; filename="${safeDownloadName}"`,
              "Content-Type": contentType,
            },
          });
        } catch (error) {
          console.error("[API] GET submission attachment error:", error);
          return Response.json({ error: "Attachment could not be loaded." }, { status: 502 });
        }
      },
    },
  },
});

