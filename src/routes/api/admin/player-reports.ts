import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import {
  WEBSITE_DATA_KEYS,
  getWebsiteRecords,
  appendWebsiteRecord,
  updateWebsiteRecord,
  deleteWebsiteRecords,
} from '@/lib/playfab/websiteData';
import type { PlayerReport } from '@/lib/playfab/types';
import {
  parseSubmissionRequest,
  uploadSubmissionAttachment,
} from '@/lib/playfab/submission-attachments';

function getSecretKey(): string {
  const key = process.env['PLAYFAB_SECRET_KEY'];
  if (!key) throw new Error('PLAYFAB_SECRET_KEY is not configured');
  return key;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const Route = createFileRoute('/api/admin/player-reports')({
  server: {
    handlers: {
      /** GET — fetch all player reports (admin-only). */
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const reports = await getWebsiteRecords<PlayerReport>(
            WEBSITE_DATA_KEYS.playerReports,
            getSecretKey(),
          );
          return Response.json({ success: true, data: reports });
        } catch (error) {
          console.error('[API] GET player-reports error:', error);
          return Response.json({ error: 'Failed to fetch player reports.' }, { status: 500 });
        }
      },

      /** POST — submit a new player report (authenticated player). */
      POST: async ({ request }) => {
        try {
          const session = await validateSessionFromRequest(request);
          if (!session) {
            return Response.json({ error: 'Authentication required.' }, { status: 401 });
          }

          const { fields, attachment } = await parseSubmissionRequest(request);
          const {
            reportedUsername,
            reportedPlayerId,
            reportType,
            description,
            attachmentName,
            attachmentType,
          } = fields;

          if (!description) {
            return Response.json({ error: 'Description is required.' }, { status: 400 });
          }

          const id = uid('PR');
          let uploadedAttachment: { attachmentUrl: string; fileName: string } | undefined;
          if (attachment) {
            try {
              uploadedAttachment = await uploadSubmissionAttachment(
                id,
                attachment,
                getSecretKey(),
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Attachment upload failed.';
              return Response.json({ error: message }, { status: 400 });
            }
          }

          const report: PlayerReport = {
            id,
            reporterId: session.playFabId,
            reporterName: session.username || session.displayName || 'Player',
            reportedUsername: reportedUsername || 'Unknown',
            reportedPlayerId: reportedPlayerId || undefined,
            reportType: reportType || 'Other',
            description,
            attachmentName: attachment?.name || attachmentName || undefined,
            attachmentUrl: uploadedAttachment?.attachmentUrl || undefined,
            attachmentType: attachment?.type || attachmentType || undefined,
            submittedAt: new Date().toISOString(),
            status: 'New',
          };

          const success = await appendWebsiteRecord(
            WEBSITE_DATA_KEYS.playerReports,
            report,
            getSecretKey(),
          );

          if (!success) {
            return Response.json({ error: 'Failed to save player report.' }, { status: 500 });
          }

          return Response.json({ success: true, data: report }, { status: 201 });
        } catch (error) {
          console.error('[API] POST player-reports error:', error);
          return Response.json({ error: 'Failed to submit player report.' }, { status: 500 });
        }
      },

      /** PATCH — update a player report status/notes (admin-only). */
      PATCH: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const { id, status, adminNotes } = (await request.json()) as {
            id?: string;
            status?: string;
            adminNotes?: string;
          };

          if (!id) {
            return Response.json({ error: 'Report ID is required.' }, { status: 400 });
          }

          const success = await updateWebsiteRecord<PlayerReport>(
            WEBSITE_DATA_KEYS.playerReports,
            id,
            (report) => ({
              ...report,
              ...(status !== undefined ? { status } : {}),
              ...(adminNotes !== undefined ? { adminNotes } : {}),
            }),
            getSecretKey(),
          );

          if (!success) {
            return Response.json({ error: 'Report not found.' }, { status: 404 });
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error('[API] PATCH player-reports error:', error);
          return Response.json({ error: 'Failed to update player report.' }, { status: 500 });
        }
      },

      /** DELETE — delete one or more player reports by ID (admin-only). */
      DELETE: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const { ids } = (await request.json()) as { ids?: string[] };
          if (!ids || ids.length === 0) {
            return Response.json({ error: 'Report IDs are required.' }, { status: 400 });
          }

          const success = await deleteWebsiteRecords(
            WEBSITE_DATA_KEYS.playerReports,
            ids,
            getSecretKey(),
          );

          if (!success) {
            return Response.json({ error: 'Failed to delete player reports.' }, { status: 500 });
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error('[API] DELETE player-reports error:', error);
          return Response.json({ error: 'Failed to delete player reports.' }, { status: 500 });
        }
      },
    },
  },
});
