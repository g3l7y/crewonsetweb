import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import {
  WEBSITE_DATA_KEYS,
  getWebsiteRecords,
  appendWebsiteRecord,
  updateWebsiteRecord,
  deleteWebsiteRecords,
} from '@/lib/playfab/websiteData';
import type { PartnershipApplication } from '@/lib/playfab/types';
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

export const Route = createFileRoute('/api/admin/partnerships')({
  server: {
    handlers: {
      /** GET — fetch all partnership applications (admin-only). */
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const applications = await getWebsiteRecords<PartnershipApplication>(
            WEBSITE_DATA_KEYS.partnerships,
            getSecretKey(),
          );
          return Response.json({ success: true, data: applications });
        } catch (error) {
          console.error('[API] GET partnerships error:', error);
          return Response.json(
            { error: 'Failed to fetch partnership applications.' },
            { status: 500 },
          );
        }
      },

      /** POST — submit a new partnership application (public or logged-in). */
      POST: async ({ request }) => {
        try {
          const session = await validateSessionFromRequest(request);
          const { fields, attachment } = await parseSubmissionRequest(request);
          const {
            brand,
            productType,
            exactModel,
            link,
            budget,
            duration,
            durationUnit,
            email,
            description,
            attachmentName,
            attachmentType,
            fileName,
          } = fields;

          if (!brand || !productType || !exactModel || !email) {
            return Response.json(
              { error: 'Brand, product type, exact model, and email are required.' },
              { status: 400 },
            );
          }

          const id = uid('APP');
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

          const application: PartnershipApplication = {
            id,
            brand: String(brand),
            productType: String(productType),
            exactModel: String(exactModel),
            link: link
              ? (/^https?:\/\//i.test(String(link).trim())
                  ? String(link).trim()
                  : `https://${String(link).trim()}`)
              : undefined,
            budget: budget ? Number(budget) : undefined,
            duration: duration ? Number(duration) : undefined,
            durationUnit: durationUnit ? String(durationUnit) : undefined,
            email: String(email),
            description: description ? String(description) : undefined,
            fileName: attachment?.name || fileName || undefined,
            attachmentName: attachment?.name || (attachmentName ? String(attachmentName) : undefined),
            attachmentUrl: uploadedAttachment?.attachmentUrl || undefined,
            attachmentType: attachment?.type || (attachmentType ? String(attachmentType) : undefined),
            submittedAt: new Date().toISOString(),
            status: 'Pending',
            // Include applicant PlayFab info if logged in
            ...(session
              ? {
                  name: session.username || session.displayName || 'Player',
                }
              : {}),
          };

          const success = await appendWebsiteRecord(
            WEBSITE_DATA_KEYS.partnerships,
            application,
            getSecretKey(),
          );

          if (!success) {
            return Response.json(
              { error: 'Failed to save partnership application.' },
              { status: 500 },
            );
          }

          return Response.json({ success: true, data: application }, { status: 201 });
        } catch (error) {
          console.error('[API] POST partnerships error:', error);
          return Response.json(
            { error: 'Failed to submit partnership application.' },
            { status: 500 },
          );
        }
      },

      /** PATCH — update application status/notes (admin-only). */
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
            return Response.json({ error: 'Application ID is required.' }, { status: 400 });
          }

          const success = await updateWebsiteRecord<PartnershipApplication>(
            WEBSITE_DATA_KEYS.partnerships,
            id,
            (app) => ({
              ...app,
              ...(status !== undefined ? { status } : {}),
              ...(adminNotes !== undefined ? { adminNotes } : {}),
            }),
            getSecretKey(),
          );

          if (!success) {
            return Response.json({ error: 'Application not found.' }, { status: 404 });
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error('[API] PATCH partnerships error:', error);
          return Response.json(
            { error: 'Failed to update partnership application.' },
            { status: 500 },
          );
        }
      },

      /** DELETE — delete one or more applications by ID (admin-only). */
      DELETE: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const { ids } = (await request.json()) as { ids?: string[] };
          if (!ids || ids.length === 0) {
            return Response.json({ error: 'Application IDs are required.' }, { status: 400 });
          }

          const success = await deleteWebsiteRecords(
            WEBSITE_DATA_KEYS.partnerships,
            ids,
            getSecretKey(),
          );

          if (!success) {
            return Response.json(
              { error: 'Failed to delete partnership applications.' },
              { status: 500 },
            );
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error('[API] DELETE partnerships error:', error);
          return Response.json(
            { error: 'Failed to delete partnership applications.' },
            { status: 500 },
          );
        }
      },
    },
  },
});
