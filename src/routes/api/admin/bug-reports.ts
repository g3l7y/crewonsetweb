import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import {
  WEBSITE_DATA_KEYS,
  getWebsiteRecords,
  appendWebsiteRecord,
  updateWebsiteRecord,
  deleteWebsiteRecords,
} from '@/lib/playfab/websiteData';
import type { BugReport } from '@/lib/playfab/types';
import { persistAdminPlayerMessage } from '@/lib/playfab/admin-player-message';
import { buildReportInvestigationMessage } from '@/lib/report-investigation-message';
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

export const Route = createFileRoute('/api/admin/bug-reports')({
  server: {
    handlers: {
      /** GET — fetch all bug reports (admin-only). */
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const reports = await getWebsiteRecords<BugReport>(
            WEBSITE_DATA_KEYS.bugReports,
            getSecretKey(),
          );
          return Response.json({ success: true, data: reports });
        } catch (error) {
          console.error('[API] GET bug-reports error:', error);
          return Response.json({ error: 'Failed to fetch bug reports.' }, { status: 500 });
        }
      },

      /** POST — submit a new bug report (player or admin). */
      POST: async ({ request }) => {
        try {
          const session = await validateSessionFromRequest(request);
          const { fields, attachment } = await parseSubmissionRequest(request);
          const { category, description, email, attachmentName, attachmentType } = fields;

          if (!category || !description) {
            return Response.json(
              { error: 'Category and description are required.' },
              { status: 400 },
            );
          }

          const id = uid('BUG');
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

          const report: BugReport = {
            id,
            playerId: session?.playFabId ?? 'anonymous',
            playerName: session?.username || session?.displayName || 'Anonymous',
            category,
            description,
            email: email || session?.email || '',
            attachmentName: attachment?.name || attachmentName || undefined,
            attachmentUrl: uploadedAttachment?.attachmentUrl || undefined,
            attachmentType: attachment?.type || attachmentType || undefined,
            submittedAt: new Date().toISOString(),
            status: 'New',
          };

          const success = await appendWebsiteRecord(
            WEBSITE_DATA_KEYS.bugReports,
            report,
            getSecretKey(),
          );

          if (!success) {
            return Response.json({ error: 'Failed to save bug report.' }, { status: 500 });
          }

          return Response.json({ success: true, data: report }, { status: 201 });
        } catch (error) {
          console.error('[API] POST bug-reports error:', error);
          return Response.json({ error: 'Failed to submit bug report.' }, { status: 500 });
        }
      },

      /** PATCH — update a bug report status/notes (admin-only). */
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

          const allowedStatuses = ['New', 'Investigating', 'Resolved'];
          if (status !== undefined && !allowedStatuses.includes(status)) {
            return Response.json({ error: 'Invalid bug report status.' }, { status: 400 });
          }
          const secretKey = getSecretKey();
          const reports = await getWebsiteRecords<BugReport>(WEBSITE_DATA_KEYS.bugReports, secretKey);
          const current = reports.find((report) => report.id === id);
          if (!current) return Response.json({ error: 'Report not found.' }, { status: 404 });

          if (status !== undefined) {
            const order: Record<string, number> = { New: 0, Investigating: 1, Resolved: 2 };
            if ((order[status] ?? -1) < (order[current.status] ?? -1)) {
              return Response.json({ error: 'Bug report statuses can only move forward.' }, { status: 409 });
            }
            if (current.status === 'New' && status === 'Investigating') {
              const playerId = current.playerId?.trim();
              if (!playerId || playerId === 'anonymous') {
                return Response.json(
                  { error: 'This report is not linked to a player account, so an Inbox update cannot be delivered.' },
                  { status: 409 },
                );
              }
              const message = buildReportInvestigationMessage({
                kind: 'bug',
                reportId: current.id,
                category: current.category,
              });
              const saved = await persistAdminPlayerMessage({
                id: 'report-' + current.id + '-investigating',
                subject: message.subject,
                body: message.body,
                recipientPlayerId: playerId,
                recipientUsername: current.playerName || 'Player',
                kind: 'report',
                secretKey,
              });
              if (!saved) return Response.json({ error: 'Could not save the player Inbox update. The report status was not changed.' }, { status: 500 });
            }
          }

          const success = await updateWebsiteRecord<BugReport>(
            WEBSITE_DATA_KEYS.bugReports,
            id,
            (report) => ({
              ...report,
              ...(status !== undefined ? { status } : {}),
              ...(adminNotes !== undefined ? { adminNotes } : {}),
            }),
            secretKey,
          );

          if (!success) {
            return Response.json({ error: 'Report not found.' }, { status: 404 });
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error('[API] PATCH bug-reports error:', error);
          return Response.json({ error: 'Failed to update bug report.' }, { status: 500 });
        }
      },

      /** DELETE — delete one or more bug reports by ID (admin-only). */
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
            WEBSITE_DATA_KEYS.bugReports,
            ids,
            getSecretKey(),
          );

          if (!success) {
            return Response.json({ error: 'Failed to delete bug reports.' }, { status: 500 });
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error('[API] DELETE bug-reports error:', error);
          return Response.json({ error: 'Failed to delete bug reports.' }, { status: 500 });
        }
      },
    },
  },
});
