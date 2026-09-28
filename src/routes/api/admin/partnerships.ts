import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import {
  WEBSITE_DATA_KEYS,
  getWebsiteRecords,
  appendWebsiteRecord,
  updateWebsiteRecord,
  deleteWebsiteRecords,
} from '@/lib/playfab/websiteData';
import type { PartnershipApplication, PartnershipPayment, PartnershipStatus } from '@/lib/playfab/types';
import {
  parseSubmissionRequest,
  uploadSubmissionAttachment,
} from '@/lib/playfab/submission-attachments';
import { createPartnershipPaymentId, findPartnershipPayment, updatePartnershipPayment } from '@/lib/partnership-payments';
import { sendPartnershipStatusEmail } from '@/lib/partnership-email';
import { getPromotionEndDate, processExpiredPromotions, sendPromotionCompletionEmail } from '@/lib/brand-promotion-lifecycle';
import { ensureBrandPromotionExpiryWorkflow } from '@/lib/brand-promotion-scheduler';
import { isMockMode } from '@/lib/playfab/config';

function getSecretKey(): string {
  const key = process.env['PLAYFAB_SECRET_KEY'];
  if (!key) throw new Error('PLAYFAB_SECRET_KEY is not configured');
  return key;
}

function uid(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

const transitions: Record<PartnershipStatus, PartnershipStatus[]> = {
  New: ['New', 'Pending', 'Declined'],
  Pending: ['Pending', 'Approved'],
  Approved: ['Approved', 'Pending', 'On-going'],
  'On-going': ['On-going', 'Pending', 'Done'],
  Done: ['Done', 'Pending'],
  Declined: ['Declined', 'Pending'],
};

function isPartnershipStatus(value: unknown): value is PartnershipStatus {
  return typeof value === 'string' && value in transitions;
}

async function trySendPartnershipStatusEmail(
  options: Parameters<typeof sendPartnershipStatusEmail>[0],
): Promise<string | undefined> {
  try {
    await sendPartnershipStatusEmail(options);
    return undefined;
  } catch (error) {
    console.error('[API] Partnership status email could not be delivered:', error);
    return error instanceof Error ? error.message : 'The partnership email could not be delivered.';
  }
}

function getPaymentMethodTypes(): string[] {
  const configured = process.env['PAYMONGO_PAYMENT_METHOD_TYPES'];
  const methods = (configured || 'card,gcash,qrph').split(',').map((method) => method.trim()).filter(Boolean);
  return methods.length > 0 ? Array.from(new Set(methods)) : ['card', 'gcash', 'qrph'];
}

function getMerchantName(): string {
  return process.env['PAYMONGO_MERCHANT_NAME']?.trim() || 'CREW ON SET';
}

function calculatePromotionEnd(startedAt: string, duration?: number, durationUnit?: string): string {
  const end = new Date(startedAt);
  const amount = Math.max(1, Math.round(Number(duration || 1)));
  if (String(durationUnit || '').toLowerCase().startsWith('month')) {
    end.setUTCMonth(end.getUTCMonth() + amount);
  } else {
    end.setUTCDate(end.getUTCDate() + amount);
  }
  return end.toISOString();
}

async function createPromotionAccessToken(applicationId: string, secretKey: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(applicationId));
  const encoded = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return applicationId + '.' + encoded;
}

function getPromotionUrl(request: Request, token: string): string {
  const publicAppUrl = (process.env['PUBLIC_APP_URL']?.trim() || new URL(request.url).origin).replace(/\/$/, '');
  return publicAppUrl + '/brand-promotions/' + encodeURIComponent(token);
}

async function startPayMongoCheckout(
  request: Request,
  application: PartnershipApplication,
  payment: PartnershipPayment,
  secretKey: string,
): Promise<{ checkoutUrl: string; checkoutSessionId: string }> {
  const publicAppUrl = (process.env['PUBLIC_APP_URL']?.trim() || new URL(request.url).origin).replace(/\/$/, '');
  const response = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(secretKey + ':'),
      'Content-Type': 'application/json',
      'Idempotency-Key': payment.id,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [{
            name: application.brand + ' partnership sponsorship',
            description: application.exactModel || 'Crew On Set brand partnership',
            amount: payment.amountInCentavos,
            currency: 'PHP',
            quantity: 1,
          }],
          payment_method_types: getPaymentMethodTypes(),
          merchant: getMerchantName(),
          description: 'Crew On Set brand partnership payment',
          show_description: true,
          show_line_items: true,
          success_url: publicAppUrl + '/brand-payment-result?payment=success&reference=' + encodeURIComponent(payment.id),
          cancel_url: publicAppUrl + '/brand-payment-result?payment=cancelled&reference=' + encodeURIComponent(payment.id),
          reference_number: payment.id,
          send_email_receipt: true,
          metadata: {
            paymentId: payment.id,
            applicationId: application.id,
            brand: application.brand || '',
          },
        },
      },
    }),
  });
  const providerBody = (await response.json().catch(() => ({}))) as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
  };
  const checkoutUrl = providerBody.data?.attributes?.checkout_url;
  const checkoutSessionId = providerBody.data?.id;
  if (!response.ok || !checkoutUrl || !checkoutSessionId) {
    console.error('[PayMongo] Brand checkout creation failed:', response.status, providerBody);
    throw new Error('PayMongo could not start the brand payment checkout.');
  }
  return { checkoutUrl, checkoutSessionId };
}

export const Route = createFileRoute('/api/admin/partnerships')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const secretKey = getSecretKey();
          await processExpiredPromotions(secretKey);
          const applications = await getWebsiteRecords<PartnershipApplication>(
            WEBSITE_DATA_KEYS.partnerships,
            secretKey,
          );
          const scheduledApplications = await Promise.all(applications.map(async (application) => {
            if (application.status !== 'On-going' || isMockMode()) return application;
            try {
              return await ensureBrandPromotionExpiryWorkflow(application, secretKey);
            } catch (error) {
              console.error('[API] Could not schedule promotion expiry workflow:', application.id, error);
              return application;
            }
          }));
          return Response.json({ success: true, data: scheduledApplications });
        } catch (error) {
          console.error('[API] GET partnerships error:', error);
          return Response.json({ error: 'Failed to fetch partnership applications.' }, { status: 500 });
        }
      },

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
            return Response.json({ error: 'Brand, product type, exact model, and email are required.' }, { status: 400 });
          }

          const id = uid('APP');
          let uploadedAttachment: { attachmentUrl: string; fileName: string } | undefined;
          if (attachment) {
            try {
              uploadedAttachment = await uploadSubmissionAttachment(id, attachment, getSecretKey());
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
              ? (/^https?:\/\//i.test(String(link).trim()) ? String(link).trim() : 'https://' + String(link).trim())
              : undefined,
            budget: budget ? Number(budget) : undefined,
            duration: duration ? Number(duration) : undefined,
            durationUnit: durationUnit ? String(durationUnit) : undefined,
            email: String(email).trim().toLowerCase(),
            description: description ? String(description) : undefined,
            fileName: attachment?.name || fileName || undefined,
            attachmentName: attachment?.name || (attachmentName ? String(attachmentName) : undefined),
            attachmentUrl: uploadedAttachment?.attachmentUrl || undefined,
            attachmentType: attachment?.type || (attachmentType ? String(attachmentType) : undefined),
            submittedAt: new Date().toISOString(),
            status: 'New',
            ...(session ? { name: session.username || session.displayName || 'Player' } : {}),
          };

          const success = await appendWebsiteRecord(WEBSITE_DATA_KEYS.partnerships, application, getSecretKey());
          if (!success) return Response.json({ error: 'Failed to save partnership application.' }, { status: 500 });
          return Response.json({ success: true, data: application }, { status: 201 });
        } catch (error) {
          console.error('[API] POST partnerships error:', error);
          return Response.json({ error: 'Failed to submit partnership application.' }, { status: 500 });
        }
      },

      PATCH: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const body = (await request.json()) as { id?: string; status?: unknown; adminNotes?: string; completionReason?: string };
          if (!body.id) return Response.json({ error: 'Application ID is required.' }, { status: 400 });

          const secretKey = getSecretKey();
          const applications = await getWebsiteRecords<PartnershipApplication>(WEBSITE_DATA_KEYS.partnerships, secretKey);
          const application = applications.find((item) => item.id === body.id);
          if (!application) return Response.json({ error: 'Application not found.' }, { status: 404 });

          if (body.status === undefined) {
            const saved = await updateWebsiteRecord<PartnershipApplication>(
              WEBSITE_DATA_KEYS.partnerships,
              application.id,
              (current) => ({ ...current, ...(body.adminNotes !== undefined ? { adminNotes: body.adminNotes } : {}) }),
              secretKey,
            );
            return saved ? Response.json({ success: true, data: application }) : Response.json({ error: 'Application not found.' }, { status: 404 });
          }

          if (!isPartnershipStatus(body.status)) {
            return Response.json({ error: 'Invalid partnership status.' }, { status: 400 });
          }
          const nextStatus = body.status;
          if (!isPartnershipStatus(application.status) || !transitions[application.status].includes(nextStatus)) {
            return Response.json({ error: 'That partnership status change is not allowed.' }, { status: 409 });
          }
          const canRetryPendingSetup = nextStatus === 'Pending' &&
            application.paymentStatus !== 'Paid' &&
            (!application.paymentCheckoutUrl || !application.paymentEmailSentAt);
          if (nextStatus === application.status && !canRetryPendingSetup) {
            return Response.json({ success: true, data: application });
          }

          let payment: PartnershipPayment | null = null;
          let emailWarning: string | undefined;
          const nextApplication: PartnershipApplication = { ...application, status: nextStatus };
          let completesPromotion = false;
          if (application.adminNotes !== undefined) nextApplication.adminNotes = application.adminNotes;

          if (application.status === 'On-going' && nextStatus === 'Done') {
            const scheduledEnd = new Date(getPromotionEndDate(application));
            const now = new Date();
            if (now.getTime() < scheduledEnd.getTime()) {
              const reason = typeof body.completionReason === 'string' ? body.completionReason.trim().slice(0, 600) : '';
              if (!reason) {
                return Response.json({ error: 'A reason is required when ending a promotion before its contract end date.' }, { status: 400 });
              }
              nextApplication.promotionEndedAt = now.toISOString();
              nextApplication.promotionEndType = 'ended-early';
              nextApplication.promotionEndReason = reason;
            } else {
              nextApplication.promotionEndedAt = scheduledEnd.toISOString();
              nextApplication.promotionEndType = 'expired';
            }
            completesPromotion = true;
          }

          if (nextStatus === 'Pending' && application.paymentStatus !== 'Paid') {
            const amountInCentavos = Math.round(Number(application.budget || 0) * 100);
            if (!Number.isFinite(amountInCentavos) || amountInCentavos <= 0) {
              return Response.json({ error: 'A positive proposed budget is required before requesting payment.' }, { status: 400 });
            }
            payment = await findPartnershipPayment(application.id, secretKey);
            if (!payment) {
              const now = new Date().toISOString();
              payment = {
                id: createPartnershipPaymentId(),
                applicationId: application.id,
                brand: application.brand || 'Brand partnership',
                email: application.email,
                amountInCentavos,
                currency: 'PHP',
                checkoutSessionId: 'pending',
                status: 'pending',
                createdAt: now,
                updatedAt: now,
              };
              const saved = await appendWebsiteRecord(WEBSITE_DATA_KEYS.partnershipPayments, payment, secretKey);
              if (!saved) return Response.json({ error: 'The brand payment could not be recorded.' }, { status: 500 });
            }
            nextApplication.paymentStatus = 'Pending';
            nextApplication.paymentId = payment.id;
            nextApplication.paymentAmount = payment.amountInCentavos / 100;

            const paymongoSecret = process.env['PAYMONGO_SECRET_KEY']?.trim();
            if ((!payment.checkoutUrl || payment.status === 'failed') && paymongoSecret) {
              const checkout = await startPayMongoCheckout(request, application, payment, paymongoSecret).catch(async (error) => {
                await updatePartnershipPayment(payment?.id || '', (current) => ({ ...current, status: 'failed', updatedAt: new Date().toISOString() }), secretKey);
                throw error;
              });
              const activated = await updatePartnershipPayment(payment.id, (current) => ({
                ...current,
                checkoutSessionId: checkout.checkoutSessionId,
                checkoutUrl: checkout.checkoutUrl,
                status: 'active',
                updatedAt: new Date().toISOString(),
              }), secretKey);
              if (!activated) return Response.json({ error: 'The brand payment could not be activated.' }, { status: 500 });
              payment = { ...payment, ...checkout, status: 'active' };
            }
            if (payment.checkoutUrl && payment.status !== 'failed') {
              nextApplication.paymentCheckoutUrl = payment.checkoutUrl;
              const emailError = await trySendPartnershipStatusEmail({
                application,
                status: 'Pending',
                paymentUrl: payment.checkoutUrl,
              });
              if (emailError) emailWarning = 'The status was saved, but the payment email could not be delivered: ' + emailError;
              else nextApplication.paymentEmailSentAt = new Date().toISOString();
            } else {
              emailWarning = paymongoSecret
                ? 'The status was saved as Pending, but a payment checkout link could not be created. Select Pending again to retry.'
                : 'The status was saved as Pending, but payment checkout is not configured. Add PAYMONGO_SECRET_KEY, then select Pending again to create the checkout link.';
            }
          } else if (application.status === 'Pending' && nextStatus === 'Approved') {
            if (application.paymentStatus !== 'Paid') {
              return Response.json({ error: 'The application cannot be approved until the brand payment is completed.' }, { status: 409 });
            }
            const emailError = await trySendPartnershipStatusEmail({ application, status: 'Approved' });
            if (emailError) emailWarning = 'The status was saved, but the approval email could not be delivered: ' + emailError;
            else nextApplication.approvalEmailSentAt = new Date().toISOString();
          } else if (nextStatus === 'On-going') {
            if (application.paymentStatus !== 'Paid') {
              return Response.json({ error: 'The application cannot go on-going until the brand payment is completed.' }, { status: 409 });
            }
            const promotionStartedAt = application.promotionStartedAt || new Date().toISOString();
            const brandPromotionToken = application.brandPromotionToken || await createPromotionAccessToken(application.id, secretKey);
            nextApplication.brandPromotionToken = brandPromotionToken;
            nextApplication.promotionStartedAt = promotionStartedAt;
            nextApplication.promotionEndsAt = application.promotionEndsAt || calculatePromotionEnd(
              promotionStartedAt,
              application.duration,
              application.durationUnit,
            );
            const emailError = await trySendPartnershipStatusEmail({
              application: nextApplication,
              status: nextStatus,
              promotionUrl: getPromotionUrl(request, brandPromotionToken),
            });
            if (emailError) emailWarning = 'The status was saved, but the promotion email could not be delivered: ' + emailError;
          } else if (!completesPromotion && !(nextStatus === 'Pending' && application.paymentStatus === 'Paid')) {
            const emailError = await trySendPartnershipStatusEmail({ application, status: nextStatus });
            if (emailError) emailWarning = 'The status was saved, but the partnership email could not be delivered: ' + emailError;
          }

          const saved = await updateWebsiteRecord<PartnershipApplication>(
            WEBSITE_DATA_KEYS.partnerships,
            application.id,
            () => nextApplication,
            secretKey,
          );
          if (!saved) return Response.json({ error: 'Failed to update partnership application.' }, { status: 500 });
          let responseApplication = nextApplication;
          if (nextStatus === 'On-going' && !isMockMode()) {
            try {
              responseApplication = await ensureBrandPromotionExpiryWorkflow(nextApplication, secretKey);
            } catch (error) {
              console.error('[API] Promotion is live but its expiry workflow could not be scheduled:', application.id, error);
              emailWarning = [emailWarning, 'The promotion is live, but its automatic expiry could not be scheduled. Please retry by refreshing the applications page or contact support.'].filter(Boolean).join(' ');
            }
          }
          if (completesPromotion) {
            try {
              await sendPromotionCompletionEmail(nextApplication, secretKey);
            } catch (error) {
              console.error('[API] Promotion completion email failed; it will be retried by the expiry job:', error);
              emailWarning = [emailWarning, 'The status was saved, but the completion email could not be delivered yet. It will be retried automatically.'].filter(Boolean).join(' ');
            }
          }
          return Response.json({ success: true, data: responseApplication, payment, emailWarning });
        } catch (error) {
          console.error('[API] PATCH partnerships error:', error);
          const message = error instanceof Error ? error.message : 'Failed to update partnership application.';
          const status = message.includes('Transactional email') || message.includes('email could not') ? 503 : 500;
          return Response.json({ error: message }, { status });
        }
      },

      DELETE: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        try {
          const { ids } = (await request.json()) as { ids?: string[] };
          if (!ids || ids.length === 0) return Response.json({ error: 'Application IDs are required.' }, { status: 400 });
          const success = await deleteWebsiteRecords(WEBSITE_DATA_KEYS.partnerships, ids, getSecretKey());
          if (!success) return Response.json({ error: 'Failed to delete partnership applications.' }, { status: 500 });
          return Response.json({ success: true });
        } catch (error) {
          console.error('[API] DELETE partnerships error:', error);
          return Response.json({ error: 'Failed to delete partnership applications.' }, { status: 500 });
        }
      },
    },
  },
});
