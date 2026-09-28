import { sendPartnershipStatusEmail } from '@/lib/partnership-email';
import {
  claimPromotionCompletionEmail,
  finishPromotionCompletionEmail,
} from '@/lib/brand-promotion-tracking';
import {
  WEBSITE_DATA_KEYS,
  appendWebsiteRecord,
  getWebsiteRecords,
  updateWebsiteRecord,
} from '@/lib/playfab/websiteData';
import type { AdminNotification, PartnershipApplication } from '@/lib/playfab/types';

function calculatePromotionEnd(startedAt: string, duration?: number, durationUnit?: string): string {
  const end = new Date(startedAt);
  const amount = Math.max(1, Math.round(Number(duration || 1)));
  if (String(durationUnit || '').toLowerCase().startsWith('month')) end.setUTCMonth(end.getUTCMonth() + amount);
  else end.setUTCDate(end.getUTCDate() + amount);
  return end.toISOString();
}

export function getPromotionEndDate(application: PartnershipApplication): string {
  const start = application.promotionStartedAt || application.paymentPaidAt || application.submittedAt;
  return application.promotionEndsAt || calculatePromotionEnd(start, application.duration, application.durationUnit);
}

export async function sendPromotionCompletionEmail(
  application: PartnershipApplication,
  secretKey: string,
): Promise<boolean> {
  if (application.status !== 'Done' || application.promotionCompletionEmailSentAt) return false;
  const eventId = 'promotion-complete:' + application.id;
  if (!(await claimPromotionCompletionEmail(eventId))) return false;
  try {
    await sendPartnershipStatusEmail({
      application,
      status: 'Done',
      completionType: application.promotionEndType === 'ended-early' ? 'ended-early' : 'expired',
      completionReason: application.promotionEndReason,
    });
    const sentAt = new Date().toISOString();
    const saved = await updateWebsiteRecord<PartnershipApplication>(
      WEBSITE_DATA_KEYS.partnerships,
      application.id,
      (current) => current.promotionCompletionEmailSentAt
        ? current
        : { ...current, promotionCompletionEmailSentAt: sentAt },
      secretKey,
    );
    await finishPromotionCompletionEmail(eventId, saved);
    if (!saved) throw new Error('Completion email was sent but the delivery receipt could not be saved.');
    return true;
  } catch (error) {
    await finishPromotionCompletionEmail(eventId, false).catch((markError) => {
      console.error('[Partnership lifecycle] Could not release email retry claim:', markError);
    });
    throw error;
  }
}

async function notifyAdminOfExpiry(application: PartnershipApplication, secretKey: string): Promise<void> {
  const notificationId = 'partnership-expired-' + application.id;
  const existing = await getWebsiteRecords<AdminNotification>(WEBSITE_DATA_KEYS.notifications, secretKey);
  if (existing.some((item) => item.id === notificationId)) return;
  const notification: AdminNotification = {
    id: notificationId,
    title: 'Brand promotion completed',
    body: (application.brand || 'A brand') + ' promotion reached its contract end date and was marked Done.',
    kind: 'partnership',
    href: '/admin/ads/AD-' + application.id,
    entityId: application.id,
    entityType: 'partnership',
    read: false,
    createdAt: new Date().toISOString(),
  };
  await appendWebsiteRecord(WEBSITE_DATA_KEYS.notifications, notification, secretKey);
}

/** Reconcile expired campaigns and retry any unsent completion emails. */
export async function processExpiredPromotions(secretKey: string, now = new Date()): Promise<{
  completed: number;
  emailsSent: number;
  emailFailures: number;
}> {
  const applications = await getWebsiteRecords<PartnershipApplication>(WEBSITE_DATA_KEYS.partnerships, secretKey);
  let completed = 0;
  let emailsSent = 0;
  let emailFailures = 0;

  for (const application of applications) {
    let current = application;
    if (application.status === 'On-going' && new Date(getPromotionEndDate(application)).getTime() <= now.getTime()) {
      const endedAt = getPromotionEndDate(application);
      const saved = await updateWebsiteRecord<PartnershipApplication>(
        WEBSITE_DATA_KEYS.partnerships,
        application.id,
        (record) => record.status === 'On-going'
          ? {
              ...record,
              status: 'Done',
              promotionEndedAt: record.promotionEndedAt || endedAt,
              promotionEndType: 'expired',
            }
          : record,
        secretKey,
      );
      if (saved) {
        current = {
          ...application,
          status: 'Done',
          promotionEndedAt: application.promotionEndedAt || endedAt,
          promotionEndType: 'expired',
        };
        completed += 1;
        await notifyAdminOfExpiry(current, secretKey).catch((error) => {
          console.error('[Partnership lifecycle] Could not create expiry notification:', error);
        });
      }
    }

    if (current.status === 'Done' && current.promotionEndType && !current.promotionCompletionEmailSentAt) {
      try {
        if (await sendPromotionCompletionEmail(current, secretKey)) emailsSent += 1;
      } catch (error) {
        emailFailures += 1;
        console.error('[Partnership lifecycle] Completion email will be retried:', error);
      }
    }
  }

  return { completed, emailsSent, emailFailures };
}
