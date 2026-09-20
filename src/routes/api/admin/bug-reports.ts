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
          const body = await request.json();
          const {
            category,
            description,
            email,
            attachmentName,
            attachmentUrl,
            attachmentType,
            page,
          } = body as Record<string, string>;

          if (!category || !description) {
            return Response.json(
              { error: 'Category and description are required.' },
              { status: 400 },
            );
          }

          const report: BugReport = {
            id: uid('BUG'),
            playerId: session?.playFabId ?? 'anonymous',
            playerName: session?.username || session?.displayName || 'Anonymous',
            category,
            description,
            email: email || session?.email || '',
            attachmentName: attachmentName || undefined,
            attachmentUrl: attachmentUrl || undefined,
            attachmentType: attachmentType || undefined,
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

          const success = await updateWebsiteRecord<BugReport>(
            WEBSITE_DATA_KEYS.bugReports,
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
