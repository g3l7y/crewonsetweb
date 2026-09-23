import { start } from 'workflow/api';
import { getPromotionEndDate } from './brand-promotion-lifecycle';
import {
  WEBSITE_DATA_KEYS,
  getWebsiteRecords,
  updateWebsiteRecord,
} from './playfab/websiteData';
import type { PartnershipApplication } from './playfab/types';
import { brandPromotionExpiryWorkflow } from './brand-promotion-expiry-workflow';

/** Start (or reuse) the Vercel timer for one real, live promotion. */
export async function ensureBrandPromotionExpiryWorkflow(
  application: PartnershipApplication,
  secretKey: string,
): Promise<PartnershipApplication> {
  if (
    process.env['VERCEL'] !== '1'
    || application.status !== 'On-going'
  ) {
    return application;
  }

  const expectedEndAt = getPromotionEndDate(application);
  if (
    application.promotionExpiryWorkflowRunId
    && application.promotionExpiryWorkflowFor === expectedEndAt
  ) {
    return application;
  }

  const run = await start(brandPromotionExpiryWorkflow, [application.id, expectedEndAt]);
  const saved = await updateWebsiteRecord<PartnershipApplication>(
    WEBSITE_DATA_KEYS.partnerships,
    application.id,
    (current) => current.status === 'On-going' && getPromotionEndDate(current) === expectedEndAt
      ? {
          ...current,
          promotionExpiryWorkflowRunId: run.runId,
          promotionExpiryWorkflowFor: expectedEndAt,
        }
      : current,
    secretKey,
  );
  if (!saved) throw new Error('The promotion expiry workflow started, but its run ID could not be saved.');

  const refreshed = (await getWebsiteRecords<PartnershipApplication>(
    WEBSITE_DATA_KEYS.partnerships,
    secretKey,
  )).find((item) => item.id === application.id);
  return refreshed || application;
}
