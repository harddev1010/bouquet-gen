import * as fs from "fs";
import path from "path";
import { Buffer } from "node:buffer";

function isResendConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim(),
  );
}

function isGoogleScriptConfigured(): boolean {
  return Boolean(
    process.env.GSCRIPT_MAIL_WEBHOOK_URL?.trim() &&
      process.env.GSCRIPT_MAIL_SECRET?.trim(),
  );
}

export function isEmailConfigured(): boolean {
  return isGoogleScriptConfigured() || isResendConfigured();
}

export interface OrderPosterMailAttachment {
  path: string;
  filename?: string;
}

/** Sends order PDF(s) via Resend email API. */
export async function sendOrderPosterPdfsEmail(opts: {
  to: string;
  orderLabel: string;
  attachments: OrderPosterMailAttachment[];
}): Promise<void> {
  const paths = opts.attachments.filter((a) => a.path && fs.existsSync(a.path));
  if (paths.length === 0) {
    throw new Error("No PDF attachments to send");
  }

  const attachmentPayload = paths.map((a) => {
    const file = fs.readFileSync(a.path);
    return {
      name: a.filename ?? path.basename(a.path),
      content: Buffer.from(file).toString("base64"),
    };
  });

  // Prefer Google Apps Script relay if configured.
  const webhookUrl = process.env.GSCRIPT_MAIL_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.GSCRIPT_MAIL_SECRET?.trim();
  if (webhookUrl && webhookSecret) {
    const scriptResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        secret: webhookSecret,
        to: opts.to,
        subject: `Your birth flower poster — ${opts.orderLabel}`,
        text: [
          "Thank you for your order.",
          "",
          "Your personalized birth flower poster PDF(s) are attached.",
          "",
          `Order: ${opts.orderLabel}`,
        ].join("\n"),
        fromName: process.env.MAIL_FROM_NAME?.trim() || "MamaLoves",
        replyTo: process.env.MAIL_REPLY_TO?.trim() || undefined,
        attachments: attachmentPayload.map((a) => ({
          filename: a.name,
          contentBase64: a.content,
        })),
      }),
    });

    if (!scriptResponse.ok) {
      const errText = await scriptResponse.text();
      throw new Error(
        `Google Script relay failed (${scriptResponse.status}): ${errText}`,
      );
    }
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error(
      "Email not configured. Set either GSCRIPT_MAIL_WEBHOOK_URL + GSCRIPT_MAIL_SECRET, or RESEND_API_KEY + MAIL_FROM",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: `Your birth flower poster — ${opts.orderLabel}`,
      text: [
        "Thank you for your order.",
        "",
        "Your personalized birth flower poster PDF(s) are attached.",
        "",
        `Order: ${opts.orderLabel}`,
      ].join("\n"),
      attachments: attachmentPayload.map((a) => ({
        filename: a.name,
        content: a.content,
      })),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Resend send failed (${response.status}): ${errText}`);
  }
}
