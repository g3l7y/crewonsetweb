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

          // PlayFab returns a short-lived signed download URL. Redirecting the
          // browser to that URL keeps the file response stream on PlayFab's
          // storage service, which is supported by both Node and edge runtimes
          // and makes images, PDFs, and the Open Attached File action work.
          return new Response(null, {
            status: 302,
            headers: {
              "Cache-Control": "private, no-store",
              Location: metadata.DownloadUrl,
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
