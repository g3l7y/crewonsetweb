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

          const extension = fileName.split(".").pop()?.toLowerCase();
          const contentType =
            extension === "pdf"
              ? "application/pdf"
              : extension === "jpg" || extension === "jpeg"
                ? "image/jpeg"
                : extension === "png"
                  ? "image/png"
                  : extension === "webp"
                    ? "image/webp"
                    : extension === "gif"
                      ? "image/gif"
                      : null;
          if (!contentType) {
            return Response.json({ error: "Unsupported attachment type." }, { status: 415 });
          }

          // Stream the signed file through this authenticated endpoint so we
          // can override PlayFab's download disposition and let the browser
          // render PDFs and images inline in previews and new tabs.
          const fileResponse = await fetch(metadata.DownloadUrl, { cache: "no-store" });
          if (!fileResponse.ok || !fileResponse.body) {
            return Response.json({ error: "Attachment could not be loaded." }, { status: 502 });
          }

          return new Response(fileResponse.body, {
            status: 200,
            headers: {
              "Cache-Control": "private, no-store",
              "Content-Disposition": `inline; filename="${fileName}"`,
              "Content-Type": contentType,
              "X-Content-Type-Options": "nosniff",
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
