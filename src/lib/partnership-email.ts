import type { PartnershipApplication, PartnershipStatus } from '@/lib/playfab/types';
import { formatPaymentAmount } from '@/lib/partnership-payments';
import nodemailer from 'nodemailer';

type PartnershipEmailOptions = {
  application: PartnershipApplication;
  status: PartnershipStatus;
  paymentUrl?: string;
  promotionUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emailCopy({ application, status, paymentUrl, promotionUrl }: PartnershipEmailOptions): {
  subject: string;
  heading: string;
  body: string;
  action?: string;
  actionUrl?: string | undefined;
} {
  const brand = escapeHtml(application.brand || 'your brand');
  const budget = formatPaymentAmount(Math.round((application.budget || 0) * 100));

  if (status === 'Pending') {
    return {
      subject: 'Payment pending for your Crew On Set brand promotion',
      heading: 'Brand promotion payment pending',
      body: 'Your Crew On Set brand promotion application for ' + brand + ' is now Pending. Payment of ' + budget + ' is required before our production team can review and approve the application. Complete the simulated PayMongo checkout using the button below.',
      action: 'Complete PayMongo Checkout',
      actionUrl: paymentUrl,
    };
  }
  if (status === 'Approved') {
    return {
      subject: 'Payment received — your Crew On Set promotion is approved',
      heading: 'Payment received — application approved',
      body: 'We received the ' + budget + ' payment for ' + brand + '. Your Crew On Set partnership application is now Approved. Our production team will coordinate the implementation of your brand promotion with you next.',
    };
  }
  if (status === 'On-going') {
    return {
      subject: 'Your Crew On Set brand promotion is now live',
      heading: 'Your partnership is live',
      body: 'The ' + brand + ' partnership is now On-going and the brand promotion is live. Use the button below to view the current promotion information, campaign dates, placement, and available performance details.',
      action: 'View Brand Promotion',
      actionUrl: promotionUrl,
    };
  }
  if (status === 'Done') {
    return {
      subject: 'Your Crew On Set brand promotion is complete',
      heading: 'Partnership completed',
      body: 'The ' + brand + ' partnership has been marked Done. The brand promotion has completed its contract with Crew On Set. Thank you for working with us.',
    };
  }
  return {
    subject: 'Update on your Crew On Set partnership application',
    heading: 'Application status update',
    body: 'Your Crew On Set partnership application for ' + brand + ' has been Declined. You may submit a new proposal if your campaign details change.',
  };
}

export async function sendPartnershipStatusEmail(options: PartnershipEmailOptions): Promise<void> {
  const smtpHost = process.env['SMTP_HOST']?.trim() || 'smtp.gmail.com';
  const smtpPort = Number(process.env['SMTP_PORT']?.trim() || '587');
  const smtpUser = process.env['SMTP_USERNAME']?.trim() || process.env['SMTP_USER']?.trim();
  const smtpPassword = process.env['SMTP_APP_PASSWORD']?.trim() || process.env['SMTP_PASSWORD']?.trim();
  const from = process.env['PARTNERSHIP_EMAIL_FROM']?.trim() || smtpUser;
  const recipient = options.application.email?.trim();
  if (!smtpUser || !smtpPassword || !from || !Number.isFinite(smtpPort) || smtpPort <= 0) {
    throw new Error('Transactional email is not configured. Set SMTP_USERNAME, SMTP_APP_PASSWORD, and PARTNERSHIP_EMAIL_FROM.');
  }
  if (!recipient) throw new Error('The partnership application does not contain a contact email.');

  const copy = emailCopy(options);
  const safeHeading = escapeHtml(copy.heading);
  const safeBody = escapeHtml(copy.body);
  const action = copy.action && copy.actionUrl
    ? '<p><a href="' + escapeHtml(copy.actionUrl) + '" style="display:inline-block;background:#f4513b;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">' + escapeHtml(copy.action) + '</a></p>'
    : '';
  const html = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0a0e19;line-height:1.6"><h1>' + safeHeading + '</h1><p>' + safeBody + '</p>' + action + '<p style="color:#667085;font-size:12px">Crew On Set</p></body></html>';
  const text = copy.heading + '\n\n' + copy.body + (copy.actionUrl ? '\n\nLink: ' + copy.actionUrl : '');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  try {
    await transporter.sendMail({
      from,
      to: recipient,
      replyTo: smtpUser,
      subject: copy.subject,
      html,
      text,
    });
  } catch (error) {
    console.error('[Email] Partnership email delivery failed:', error);
    throw new Error('The partnership email could not be delivered.');
  }
}