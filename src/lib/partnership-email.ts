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
  const brand = application.brand || 'your brand';
  const budget = formatPaymentAmount(Math.round((application.budget || 0) * 100));

  if (status === 'Pending') {
    return {
      subject: 'Action required: payment for your Crew On Set partnership',
      heading: 'Payment required for your brand partnership',
      body: 'Thank you for submitting your brand partnership proposal to Crew On Set. Your application for ' + brand + ' is now pending payment. Please complete the ' + budget + ' payment through the secure PayMongo Checkout link below. Once payment is confirmed, our partnership team will continue its review and contact you regarding the next steps.',
      action: 'Complete PayMongo Checkout',
      actionUrl: paymentUrl,
    };
  }
  if (status === 'Approved') {
    return {
      subject: 'Your Crew On Set partnership has been approved',
      heading: 'Payment received — partnership approved',
      body: 'We are pleased to confirm receipt of your ' + budget + ' payment for ' + brand + '. Your Crew On Set partnership application has been approved. Our production team will coordinate the campaign details and implementation with you shortly.',
    };
  }
  if (status === 'On-going') {
    return {
      subject: 'Your Crew On Set brand partnership is now live',
      heading: 'Your brand partnership is live',
      body: 'Your ' + brand + ' partnership with Crew On Set is now live. Use the link below to review the campaign details, schedule, placement, and current performance information.',
      action: 'View Brand Promotion',
      actionUrl: promotionUrl,
    };
  }
  if (status === 'Done') {
    return {
      subject: 'Your Crew On Set brand partnership is complete',
      heading: 'Partnership completed',
      body: 'The ' + brand + ' partnership has completed its agreed contract with Crew On Set. Thank you for working with our team. We appreciate the opportunity to work with your brand.',
    };
  }
  return {
    subject: 'Update on your Crew On Set partnership proposal',
    heading: 'Partnership proposal update',
    body: 'After careful review, we are unable to move forward with the proposed partnership for ' + brand + ' at this time. We appreciate your interest in working with Crew On Set and welcome a new proposal if your campaign details change.',
  };
}

export async function sendPartnershipStatusEmail(options: PartnershipEmailOptions): Promise<void> {
  const smtpHost = process.env['SMTP_HOST']?.trim() || 'smtp.gmail.com';
  const smtpPort = Number(process.env['SMTP_PORT']?.trim() || '587');
  const smtpUser = process.env['SMTP_USERNAME']?.trim() || process.env['SMTP_USER']?.trim();
  const smtpPassword = (process.env['SMTP_APP_PASSWORD']?.trim() || process.env['SMTP_PASSWORD']?.trim())?.replace(/\s+/g, '');
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
  const html = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0a0e19;line-height:1.6"><h1>' + safeHeading + '</h1><p>' + safeBody + '</p>' + action + '<p style="color:#667085;font-size:12px">Crew On Set Partnerships<br>crewonsetgame@gmail.com</p></body></html>';
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
      from: 'Crew On Set Partnerships <' + from + '>',
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