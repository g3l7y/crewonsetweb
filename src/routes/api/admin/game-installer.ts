import { createFileRoute } from "@tanstack/react-router";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import {
  finalizeGameInstallerUpload,
  initiateGameInstallerUpload,
} from "@/lib/playfab/game-installer-files";

function getSecretKey() {
  return process.env["PLAYFAB_SECRET_KEY"] || null;
}

export const Route = createFileRoute("/api/admin/game-installer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const secretKey = getSecretKey();
        if (!secretKey)
          return Response.json({ error: "Installer storage is not configured." }, { status: 503 });

        try {
          const body = (await request.json()) as {
            action?: string;
            fileName?: string;
            profileVersion?: number;
          };
          if (body.action === "initiate") {
            const upload = await initiateGameInstallerUpload(secretKey);
            return Response.json({ success: true, data: upload });
          }
          if (body.action === "finalize" && body.fileName && body.profileVersion !== undefined) {
            await finalizeGameInstallerUpload(body.fileName, body.profileVersion, secretKey);
            return Response.json({ success: true });
          }
          return Response.json({ error: "Invalid installer upload request." }, { status: 400 });
        } catch (error) {
          console.error("[API] game installer upload error:", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Installer upload failed." },
            { status: 502 },
          );
        }
      },
    },
  },
});
