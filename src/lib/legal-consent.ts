export const TERMS_VERSION = "2026-09-24";
export const PRIVACY_POLICY_VERSION = "2026-09-24";

export function createPolicyAcceptanceRecord(acceptedAt = new Date().toISOString()) {
  return JSON.stringify({
    termsVersion: TERMS_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    acceptedAt,
  });
}
