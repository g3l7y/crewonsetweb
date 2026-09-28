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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

type PayMongoCheckoutResponse = {
  data?: {
    attributes?: {
      payments?: unknown[];
      payment_intent?: {
        attributes?: {
          amount?: number;
          currency?: string;
          status?: string;
        };
      };
    };
  };
};

export async function isPartnershipCheckoutPaid(
  payment: PartnershipPayment,
  paymongoSecret: string,
): Promise<boolean> {
  if (!payment.checkoutSessionId || payment.checkoutSessionId === 'pending') return false;

  const response = await fetch(
    'https://api.paymongo.com/v1/checkout_sessions/' + encodeURIComponent(payment.checkoutSessionId),
    {
      headers: {
        Authorization: 'Basic ' + btoa(paymongoSecret + ':'),
        Accept: 'application/json',
      },
    },
  );
  const result = await response.json().catch(() => ({})) as PayMongoCheckoutResponse;
  if (!response.ok) {
    throw new Error('PayMongo checkout verification failed with status ' + response.status + '.');
  }

  const attributes = asRecord(result.data?.attributes);
  const payments = Array.isArray(attributes.payments) ? attributes.payments : [];
  const paidPayment = payments.some((entry) => {
    const paymentAttributes = asRecord(asRecord(entry).attributes);
    const status = String(paymentAttributes.status || '').toLowerCase();
    const currency = String(paymentAttributes.currency || 'PHP').toUpperCase();
    const rawAmount = paymentAttributes.amount ?? paymentAttributes.net_amount;
    const amount = rawAmount === undefined ? undefined : Number(rawAmount);
    return status === 'paid' && currency === 'PHP' && amount === payment.amountInCentavos;
  });
  if (paidPayment) return true;

  const paymentIntent = asRecord(attributes.payment_intent);
  const paymentIntentAttributes = asRecord(paymentIntent.attributes);
  return String(paymentIntentAttributes.status || '').toLowerCase() === 'succeeded'
    && String(paymentIntentAttributes.currency || 'PHP').toUpperCase() === 'PHP'
    && Number(paymentIntentAttributes.amount) === payment.amountInCentavos;
}

export async function markPartnershipPaymentPaid(
  payment: PartnershipPayment,
  eventId: string,
  secretKey: string,
): Promise<{ updated: boolean; alreadyPaid: boolean }> {
  const wasAlreadyPaid = payment.status === 'fulfilled';
  const paidAt = new Date().toISOString();

  if (!wasAlreadyPaid) {
    const paymentUpdated = await updatePartnershipPayment(
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
    if (!paymentUpdated) return { updated: false, alreadyPaid: false };
  }

  const applicationUpdated = await updateWebsiteRecord<PartnershipApplication>(
    WEBSITE_DATA_KEYS.partnerships,
    payment.applicationId,
    (application) => ({
      ...application,
      paymentStatus: 'Paid',
      paymentId: payment.id,
      paymentAmount: payment.amountInCentavos / 100,
      paymentPaidAt: application.paymentPaidAt || payment.paidAt || paidAt,
    }),
    secretKey,
  );
  if (!applicationUpdated) return { updated: false, alreadyPaid: false };

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
        createdAt: payment.paidAt || paidAt,
      },
      secretKey,
    );
  }

  return { updated: !wasAlreadyPaid, alreadyPaid: wasAlreadyPaid };
}

export function formatPaymentAmount(amountInCentavos: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amountInCentavos / 100);
}