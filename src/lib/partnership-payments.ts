import {
  WEBSITE_DATA_KEYS,
  appendWebsiteRecord,
  getWebsiteRecords,
  updateWebsiteRecord,
} from '@/lib/playfab/websiteData';
import type { PartnershipApplication, PartnershipPayment } from '@/lib/playfab/types';

export function createPartnershipPaymentId(): string {
  return 'COS-BRAND-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

export async function getPartnershipPayments(secretKey: string): Promise<PartnershipPayment[]> {
  return getWebsiteRecords<PartnershipPayment>(WEBSITE_DATA_KEYS.partnershipPayments, secretKey);
}

export async function findPartnershipPayment(
  applicationId: string,
  secretKey: string,
): Promise<PartnershipPayment | null> {
  const payments = await getPartnershipPayments(secretKey);
  return payments.find((payment) => payment.applicationId === applicationId) ?? null;
}

export async function savePartnershipPayment(
  payment: PartnershipPayment,
  secretKey: string,
): Promise<boolean> {
  return appendWebsiteRecord(WEBSITE_DATA_KEYS.partnershipPayments, payment, secretKey);
}

export async function updatePartnershipPayment(
  paymentId: string,
  updater: (payment: PartnershipPayment) => PartnershipPayment,
  secretKey: string,
): Promise<boolean> {
  return updateWebsiteRecord(WEBSITE_DATA_KEYS.partnershipPayments, paymentId, updater, secretKey);
}

export async function markPartnershipPaymentPaid(
  payment: PartnershipPayment,
  eventId: string,
  secretKey: string,
): Promise<{ updated: boolean; alreadyPaid: boolean }> {
  if (payment.status === 'fulfilled') return { updated: false, alreadyPaid: true };

  const paidAt = new Date().toISOString();
  const updated = await updatePartnershipPayment(
    payment.id,
    (current) => ({
      ...current,
      status: 'fulfilled',
      paidAt: current.paidAt || paidAt,
      updatedAt: paidAt,
      eventId: current.eventId || eventId,
    }),
    secretKey,
  );
  if (!updated) return { updated: false, alreadyPaid: false };

  await updateWebsiteRecord<PartnershipApplication>(
    WEBSITE_DATA_KEYS.partnerships,
    payment.applicationId,
    (application) => ({
      ...application,
      paymentStatus: 'Paid',
      paymentId: payment.id,
      paymentAmount: payment.amountInCentavos / 100,
      paymentPaidAt: application.paymentPaidAt || paidAt,
    }),
    secretKey,
  );

  const existingNotifications = await getWebsiteRecords<{ id: string }>(
    WEBSITE_DATA_KEYS.notifications,
    secretKey,
  );
  const notificationId = 'brand-payment-' + payment.id;
  if (!existingNotifications.some((item) => item.id === notificationId)) {
    await appendWebsiteRecord(
      WEBSITE_DATA_KEYS.notifications,
      {
        id: notificationId,
        title: 'Brand payment received',
        body: payment.brand + ' completed the ' + formatPaymentAmount(payment.amountInCentavos) + ' sponsorship payment.',
        kind: 'application',
        href: '/admin/partnerships',
        entityId: payment.applicationId,
        entityType: 'partnership-payment',
        read: false,
        createdAt: paidAt,
      },
      secretKey,
    );
  }

  return { updated: true, alreadyPaid: false };
}

export function formatPaymentAmount(amountInCentavos: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amountInCentavos / 100);
}