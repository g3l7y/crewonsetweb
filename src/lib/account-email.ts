import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMailer() {
  const host = process.env["SMTP_HOST"]?.trim() || "smtp.gmail.com";
  const port = Number(process.env["SMTP_PORT"]?.trim() || "587");
  const user = process.env["SMTP_USERNAME"]?.trim() || process.env["SMTP_USER"]?.trim();
  const password = (
    process.env["SMTP_APP_PASSWORD"]?.trim() || process.env["SMTP_PASSWORD"]?.trim()
  )?.replace(/\s+/g, "");
  const from = process.env["PARTNERSHIP_EMAIL_FROM"]?.trim() || user;
  if (!user || !password || !from || !Number.isFinite(port) || port <= 0) {
    throw new Error(
      "Account email is not configured. Set SMTP_USERNAME, SMTP_APP_PASSWORD, and PARTNERSHIP_EMAIL_FROM.",
    );
  }
  return {
    from: `Crew On Set <${from}>`,
    replyTo: user,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass: password },
    }),
  };
}

export async function sendAccountEmailChangeLink(
  to: string,
  actionUrl: string,
  role: "player" | "admin",
) {
  const mailer = getMailer();
  const accountName = role === "admin" ? "administrator" : "player";
  const subject = "Confirm your Crew On Set email change request";
  const heading = "Email change requested";
  const body = `A request was made to change the email address on your ${accountName} account. If this was you, use the button below to return to Account Settings and enter your new email address. This link expires in 30 minutes and can only be used once. If you did not make this request, you can ignore this message.`;
  const safeUrl = escapeHtml(actionUrl);
    await mailer.transporter.sendMail({
    from: mailer.from,
    replyTo: mailer.replyTo,
    to,
    subject,
    text: `${heading}\n\n${body}\n\nContinue: ${actionUrl}`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0a0e19;line-height:1.6"><h1>${heading}</h1><p>${body}</p><p><a href="${safeUrl}" style="display:inline-block;background:#f4513b;color:#fff;padding:13px 20px;border-radius:7px;text-decoration:none;font-weight:700">Continue to account settings</a></p><p style="color:#667085;font-size:12px">Crew On Set! If you did not request this, no action is needed.</p></body></html>`,
    });
    return true;
}

export async function sendAccountEmailChangeConfirmation(
  to: string,
  username: string,
  role: "player" | "admin",
) {
  const mailer = getMailer();
  const subject = "Your Crew On Set account email has been changed";
  const heading = "Email address updated";
  const body = `This confirms that ${to} is now the email address associated with the ${role} account “${username}”. If you did not make this change, contact Crew On Set support immediately.`;
  await mailer.transporter.sendMail({
    from: mailer.from,
    replyTo: mailer.replyTo,
    to,
    subject,
    text: `${heading}\n\n${body}`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0a0e19;line-height:1.6"><h1>${heading}</h1><p>${escapeHtml(body)}</p><p style="color:#667085;font-size:12px">Crew On Set!</p></body></html>`,
  });
}

export async function sendPlayerWelcomeEmail(to: string, username: string) {
  const mailer = getMailer();
  const safeUsername = username.trim() || "Crew Player";
  const subject = "Welcome to Crew On Set!";
  const heading = "You’re now a Crew Player";
  const body = `Hello ${safeUsername},\n\nThank you for joining Crew On Set. We’re grateful to have you as part of the community, and we hope you enjoy bringing each production to life with your crew.\n\nYour account is ready. You can use your Crew On Set credentials to access your player account.`;
  await mailer.transporter.sendMail({
    from: mailer.from,
    replyTo: mailer.replyTo,
    to,
    subject,
    text: `${heading}\n\n${body}\n\nCrew On Set!`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0a0e19;line-height:1.6"><h1>${heading}</h1><p>Hello ${escapeHtml(safeUsername)},</p><p>Thank you for joining Crew On Set. We’re grateful to have you as part of the community, and we hope you enjoy bringing each production to life with your crew.</p><p>Your account is ready. You can use your Crew On Set credentials to access your player account.</p><p style="color:#667085;font-size:12px">Crew On Set!</p></body></html>`,
  });
}

export async function sendBanAppealVerificationCode(to: string, code: string) {
  const mailer = getMailer();
  const subject = "Verify your Crew On Set ban appeal";
  const body = `Use this code to verify your identity and submit a ban appeal: ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`;
  await mailer.transporter.sendMail({
    from: mailer.from,
    replyTo: mailer.replyTo,
    to,
    subject,
    text: `${body}\n\nCrew On Set!`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0a0e19;line-height:1.6"><h1>Verify your ban appeal</h1><p>${escapeHtml(body)}</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${escapeHtml(code)}</p><p style="color:#667085;font-size:12px">Crew On Set!</p></body></html>`,
  });
}

export async function sendPlayerBanNoticeEmail(to: string, username: string, startsAt: string, endsAt: string | null, appealUrl: string) {
  const mailer = getMailer();
  const subject = "Your Crew On Set account has been banned";
  const dateText = (value: string) => new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
  const duration = endsAt ? `This ban started on ${dateText(startsAt)} and is scheduled to end on ${dateText(endsAt)} (Philippine time).` : `This is a permanent ban, effective ${dateText(startsAt)} (Philippine time).`;
  const body = `Hello ${username}, your Crew On Set player account has been banned. ${duration} You cannot sign in to the website or game while the ban is active. If you think this was a mistake, you can submit an appeal using the link below.`;
  const safeUrl = escapeHtml(appealUrl);
  await mailer.transporter.sendMail({
    from: mailer.from,
    replyTo: mailer.replyTo,
    to,
    subject,
    text: `${body}\n\nSubmit an appeal: ${appealUrl}\n\nCrew On Set!`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0a0e19;line-height:1.6"><h1>Account banned</h1><p>${escapeHtml(body)}</p><p><a href="${safeUrl}" style="display:inline-block;background:#f4513b;color:#fff;padding:13px 20px;border-radius:7px;text-decoration:none;font-weight:700">Submit an appeal</a></p><p style="color:#667085;font-size:12px">Crew On Set!</p></body></html>`,
  });
}

export async function sendBanAppealDecisionEmail(to: string, username: string, decision: "Approved" | "Denied", notes?: string, banEndsAt?: string | null) {
  const mailer = getMailer();
  const approved = decision === "Approved";
  const subject = approved ? "Your Crew On Set ban appeal was approved" : "Your Crew On Set ban appeal was denied";
  const banEndNotice = !approved && banEndsAt
    ? ` You can sign in after the ban ends on ${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(banEndsAt))} Philippine time.`
    : !approved ? " This ban is permanent, so the account remains banned unless an administrator restores access later." : "";
  const body = approved
    ? `Hello ${username}, your appeal was approved and your account ban has been lifted. Your account is active again and you can sign in to the website and game.`
    : `Hello ${username}, your ban appeal was reviewed and denied. The ban remains in place and your account access is still suspended.${banEndNotice}${notes?.trim() ? ` Admin note from the review team: ${notes.trim()}` : ""}`;
  await mailer.transporter.sendMail({
    from: mailer.from,
    replyTo: mailer.replyTo,
    to,
    subject,
    text: `${body}\n\nCrew On Set!`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0a0e19;line-height:1.6"><h1>${approved ? "Appeal approved" : "Ban appeal denied"}</h1><p>${escapeHtml(body)}</p><p style="color:#667085;font-size:12px">Crew On Set!</p></body></html>`,
  });
}

export function accountEmailActionUrl(request: Request, path: string, token: string) {
  const configuredOrigin = process.env["PUBLIC_APP_URL"]?.trim();
  const origin = configuredOrigin || new URL(request.url).origin;
  const url = new URL(path, origin);
  url.searchParams.set("emailChangeToken", token);
  return url.toString();
}

export async function sendAccountDeletionEmail(to: string, username: string) {
  const mailer = getMailer();
  await mailer.transporter.sendMail({ from: mailer.from, to, subject: "Your Crew On Set account has been deleted", text: `Hello ${username}, your Crew On Set account deletion request has been accepted and your account is closed. Thank you for being part of the crew.` });
}

export async function sendPayMongoRefundReceiptEmail(
  to: string,
  details: {
    recipientName: string;
    transactionLabel: string;
    refundAmountPhp: number;
    originalAmountPhp: number;
    refundId: string;
    paymentReference: string;
    reason: string;
    notes?: string;
    refundDate: string;
  },
): Promise<boolean> {
  const mailer = getMailer();
  const name = details.recipientName.trim() || "Crew On Set customer";
  const refundAmount = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(details.refundAmountPhp);
  const originalAmount = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(details.originalAmountPhp);
  const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(details.refundDate));
  const subject = "Your Crew On Set refund receipt";
  const body = `Hello ${name},\n\nA refund of ${refundAmount} for ${details.transactionLabel} has been processed to the original payment method. Your original payment was ${originalAmount}. The time it takes to appear depends on your payment provider or bank.\n\nPayment reference: ${details.paymentReference}\nRefund reference: ${details.refundId}\nProcessed: ${date}\nReason: ${details.reason}${details.notes?.trim() ? `\nAdmin note: ${details.notes.trim()}` : ""}\n\nKeep this email for your records. If you have questions, contact Crew On Set support.`;
  const safe = (value: string) => escapeHtml(value);
  await mailer.transporter.sendMail({
    from: mailer.from,
    replyTo: mailer.replyTo,
    to,
    subject,
    text: `${body}\n\nCrew On Set!`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0a0e19;line-height:1.6"><h1>Refund processed</h1><p>Hello ${safe(name)},</p><p>A refund of <strong>${safe(refundAmount)}</strong> for ${safe(details.transactionLabel)} has been processed to the original payment method. Your original payment was ${safe(originalAmount)}. The time it takes to appear depends on your payment provider or bank.</p><table style="border-collapse:collapse"><tr><td style="padding:5px 16px 5px 0">Payment reference</td><td>${safe(details.paymentReference)}</td></tr><tr><td style="padding:5px 16px 5px 0">Refund reference</td><td>${safe(details.refundId)}</td></tr><tr><td style="padding:5px 16px 5px 0">Processed</td><td>${safe(date)}</td></tr><tr><td style="padding:5px 16px 5px 0">Reason</td><td>${safe(details.reason)}</td></tr>${details.notes?.trim() ? `<tr><td style="padding:5px 16px 5px 0">Admin note</td><td>${safe(details.notes.trim())}</td></tr>` : ""}</table><p>Keep this email for your records. If you have questions, contact Crew On Set support.</p><p style="color:#667085;font-size:12px">Crew On Set!</p></body></html>`,
  });
  return true;
}
