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
          const body = await request.json();
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
            attachmentUrl,
            attachmentType,
          } = body as Record<string, unknown>;

          if (!brand || !productType || !exactModel || !email) {
            return Response.json(
              { error: 'Brand, product type, exact model, and email are required.' },
              { status: 400 },
            );
          }

          const application: PartnershipApplication = {
            id: uid('APP'),
            brand: String(brand),
            productType: String(productType),
            exactModel: String(exactModel),
            link: link ? String(link) : undefined,
            budget: budget ? Number(budget) : undefined,
            duration: duration ? Number(duration) : undefined,
            durationUnit: durationUnit ? String(durationUnit) : undefined,
            email: String(email),
            description: description ? String(description) : undefined,
            attachmentName: attachmentName ? String(attachmentName) : undefined,
            attachmentUrl: attachmentUrl ? String(attachmentUrl) : undefined,
            attachmentType: attachmentType ? String(attachmentType) : undefined,
            submittedAt: new Date().toISOString(),
            status: 'Pending',
            // Include applicant PlayFab info if logged in
            ...(session
              ? {
                  name: session.displayName,
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
