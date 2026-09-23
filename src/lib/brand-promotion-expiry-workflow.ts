import { FatalError, sleep } from 'workflow';
import { getPromotionEndDate, processExpiredPromotions } from './brand-promotion-lifecycle';
import { WEBSITE_DATA_KEYS, getWebsiteRecords } from './playfab/websiteData';
import type { PartnershipApplication } from './playfab/types';

type ExpiryCheck =
  | { state: 'completed' | 'cancelled' }
  | { state: 'not-due'; waitMs: number }
  | { state: 'missing-config' };

async function reconcilePromotionExpiryStep(
  applicationId: string,
  expectedEndAt: string,
): Promise<ExpiryCheck> {
  'use step';

  const secretKey = process.env['PLAYFAB_SECRET_KEY']?.trim();
  if (!secretKey) return { state: 'missing-config' };

  const applications = await getWebsiteRecords<PartnershipApplication>(
    WEBSITE_DATA_KEYS.partnerships,
    secretKey,
  );
  const application = applications.find((item) => item.id === applicationId);
  if (!application) return { state: 'cancelled' };
  if (getPromotionEndDate(application) !== expectedEndAt) return { state: 'cancelled' };

  const isRetryableExpiredRecord = application.status === 'Done'
    && application.promotionEndType === 'expired'
    && !application.promotionCompletionEmailSentAt;
  if (application.status !== 'On-going' && !isRetryableExpiredRecord) {
    return {
      state: application.status === 'Done' && application.promotionEndType === 'expired'
        ? 'completed'
        : 'cancelled',
    };
  }

  const remainingMs = Date.parse(expectedEndAt) - Date.now();
  if (application.status === 'On-going' && remainingMs > 0) {
    return { state: 'not-due', waitMs: remainingMs };
  }

  const result = await processExpiredPromotions(secretKey);
  if (result.emailFailures > 0) {
    throw new Error('Promotion completion email delivery failed and should be retried.');
  }

  const refreshed = (await getWebsiteRecords<PartnershipApplication>(
    WEBSITE_DATA_KEYS.partnerships,
    secretKey,
  )).find((item) => item.id === applicationId);
  if (!refreshed) return { state: 'cancelled' };
  if (
    refreshed.status === 'Done'
    && refreshed.promotionEndType === 'expired'
    && refreshed.promotionCompletionEmailSentAt
  ) {
    return { state: 'completed' };
  }
  if (refreshed.status !== 'On-going' && refreshed.status !== 'Done') {
    return { state: 'cancelled' };
  }

  return {
    state: 'not-due',
    waitMs: Math.max(30_000, Date.parse(expectedEndAt) - Date.now()),
  };
}

/**
 * Holds a durable Vercel timer until the contract end, then reconciles the
 * application and retries transient PlayFab/SMTP errors with bounded backoff.
 */
export async function brandPromotionExpiryWorkflow(
  applicationId: string,
  expectedEndAt: string,
): Promise<void> {
  'use workflow';

  const endTime = Date.parse(expectedEndAt);
  if (!Number.isFinite(endTime)) {
    throw new FatalError('The promotion contract end date is invalid.');
  }

  if (endTime > Date.now()) await sleep(new Date(endTime));

  let retryDelayMs = 30_000;
  while (true) {
    let check: ExpiryCheck;
    try {
      check = await reconcilePromotionExpiryStep(applicationId, expectedEndAt);
    } catch {
      await sleep(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 15 * 60_000);
      continue;
    }

    if (check.state === 'completed' || check.state === 'cancelled') return;
    if (check.state === 'missing-config') {
      throw new FatalError('PLAYFAB_SECRET_KEY is not configured for promotion expiry.');
    }
    if (check.state === 'not-due') {
      await sleep(Math.max(1_000, check.waitMs));
      retryDelayMs = 30_000;
    }
  }
}
