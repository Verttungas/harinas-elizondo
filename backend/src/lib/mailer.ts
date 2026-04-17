import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export interface EnviarCorreoParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: SendMailOptions["attachments"];
}

export interface EnviarCorreoResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    ignoreTLS: true,
  });
  return cachedTransporter;
}

export async function enviarCorreo(
  params: EnviarCorreoParams,
): Promise<EnviarCorreoResult> {
  const transporter = getTransporter();
  const from = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments,
    });
    logger.info(
      { to: params.to, messageId: info.messageId },
      "mail sent successfully",
    );
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown mail transport error";
    logger.error({ err, to: params.to }, "mail send failed");
    return { success: false, error: message };
  }
}
