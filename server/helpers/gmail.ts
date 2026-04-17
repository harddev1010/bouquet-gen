import * as fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

export function isGmailConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim(),
  );
}

export interface OrderPosterMailAttachment {
  path: string;
  filename?: string;
}

/**
 * Sends order PDF(s) via Gmail SMTP (use an App Password, not your login password).
 * Env: GMAIL_USER, GMAIL_APP_PASSWORD; optional MAIL_FROM (defaults to GMAIL_USER).
 */
export async function sendOrderPosterPdfsEmail(opts: {
  to: string;
  orderLabel: string;
  attachments: OrderPosterMailAttachment[];
}): Promise<void> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) {
    throw new Error(
      "Gmail SMTP not configured: set GMAIL_USER and GMAIL_APP_PASSWORD",
    );
  }

  const paths = opts.attachments.filter((a) => a.path && fs.existsSync(a.path));
  if (paths.length === 0) {
    throw new Error("No PDF attachments to send");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const from =
    process.env.MAIL_FROM?.trim() || `MamaLoves <${user}>`;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: `Your birth flower poster — ${opts.orderLabel}`,
    text: [
      "Thank you for your order.",
      "",
      "Your personalized birth flower poster PDF(s) are attached.",
      "",
      `Order: ${opts.orderLabel}`,
    ].join("\n"),
    attachments: paths.map((a) => ({
      filename: a.filename ?? path.basename(a.path),
      path: a.path,
    })),
  });
}
