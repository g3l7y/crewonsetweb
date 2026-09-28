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

export function accountEmailActionUrl(request: Request, path: string, token: string) {
  const configuredOrigin = process.env["PUBLIC_APP_URL"]?.trim();
  const origin = configuredOrigin || new URL(request.url).origin;
  const url = new URL(path, origin);
  url.searchParams.set("emailChangeToken", token);
  return url.toString();
}
