import { createFileRoute } from '@tanstack/react-router';
import { PLAYFAB_API_BASE, isMockMode } from '@/lib/playfab/config';
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

type PlayFabAccountInfo = {
  PlayFabId?: string;
  Username?: string;
  TitleInfo?: {
    DisplayName?: string;
  };
};

type ReportedPlayerLookup = {
  player: { playFabId: string; username: string } | null;
  providerUnavailable: boolean;
};

async function findRealReportedPlayer(
  sessionTicket: string,
  reporterId: string,
  username: string,
): Promise<ReportedPlayerLookup> {
  let providerUnavailable = false;
  const normalizedUsername = username.trim().toLowerCase();

  for (const lookup of [{ TitleDisplayName: username }, { Username: username }]) {
    try {
      const playfabResponse = await fetch(`${PLAYFAB_API_BASE}/Client/GetAccountInfo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': sessionTicket,
        },
        body: JSON.stringify(lookup),
      });
      const result = await playfabResponse.json().catch(() => ({}));
      const account = result?.data?.AccountInfo as PlayFabAccountInfo | undefined;
      const playFabId = account?.PlayFabId?.trim() ?? '';
      const displayName = account?.TitleInfo?.DisplayName?.trim() ?? '';
      const playFabUsername = account?.Username?.trim() ?? '';

      if (playfabResponse.status >= 500 || Number(result?.code) >= 500) {
        providerUnavailable = true;
        continue;
      }

      const matchesUsername = displayName.toLowerCase() === normalizedUsername ||
        playFabUsername.toLowerCase() === normalizedUsername;
      if (playfabResponse.ok && result?.code === 200 && playFabId && playFabId !== reporterId && matchesUsername) {
        return {
          player: {
            playFabId,
            username: displayName || playFabUsername || username.trim(),
          },
          providerUnavailable,
        };
      }
    } catch {
      providerUnavailable = true;
    }
  }

  return { player: null, providerUnavailable };
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

          const normalizedReportedUsername = reportedUsername?.trim() ?? '';
          if (!normalizedReportedUsername) {
            return Response.json({ error: 'The reported username is required.' }, { status: 400 });
          }

          let resolvedReportedUsername = normalizedReportedUsername;
          let resolvedReportedPlayerId = reportedPlayerId?.trim() || undefined;
          if (!isMockMode()) {
            const lookup = await findRealReportedPlayer(session.sessionTicket || '', session.playFabId, normalizedReportedUsername);
            if (!lookup.player) {
              return Response.json(
                { error: lookup.providerUnavailable
                    ? 'Player lookup is temporarily unavailable. Please try again.'
                    : 'The reported username must match an existing player account.' },
                { status: lookup.providerUnavailable ? 503 : 400 },
              );
            }
            resolvedReportedUsername = lookup.player.username;
            resolvedReportedPlayerId = lookup.player.playFabId;
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
            reportedUsername: resolvedReportedUsername,
            reportedPlayerId: resolvedReportedPlayerId,
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
