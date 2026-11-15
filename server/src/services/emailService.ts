import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Creates a Nodemailer transporter.
 * If SMTP host or user is unset, returns null to trigger console fallback.
 */
function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

const transporter = createTransporter();

/**
 * Send an email notification with console fallback when SMTP is unset.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  // If SMTP is unset or in test without SMTP, use console fallback
  if (!transporter) {
    console.log(
      `[EmailService Fallback] Simulated Email: To=${payload.to} | Subject="${payload.subject}" | Content=${payload.html.replace(/<[^>]*>/g, '').trim()}`
    );
    return true;
  }

  try {
    await transporter.sendMail({
      from: env.FROM_EMAIL || 'notifications@carecircle.local',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.html.replace(/<[^>]*>/g, ''),
    });
    return true;
  } catch (error) {
    console.warn('[EmailService] Failed to deliver email via SMTP, logging fallback:', error);
    console.log(`[EmailService Fallback] To=${payload.to} | Subject="${payload.subject}"`);
    return false;
  }
}

export interface NotificationWithDedupeParams {
  circleId: string;
  type: 'MISSED_DOSE' | 'LOW_REFILL' | 'PENDING_APPROVAL' | 'APPOINTMENT';
  title: string;
  message: string;
  dedupeKey?: string;
  emailTo?: string;
  emailSubject?: string;
  emailHtml?: string;
}

/**
 * Creates a NotificationLog entry with dedupeKey enforcement and optional email sending.
 * Returns true if new notification logged & sent, false if deduped.
 */
export async function sendNotificationWithDedupe(
  params: NotificationWithDedupeParams
): Promise<boolean> {
  // Check if dedupeKey exists first
  if (params.dedupeKey) {
    const existing = await prisma.notificationLog.findUnique({
      where: { dedupeKey: params.dedupeKey },
    });
    if (existing) {
      return false; // Already sent
    }
  }

  try {
    const emailSent = Boolean(params.emailTo);
    await prisma.notificationLog.create({
      data: {
        circleId: params.circleId,
        type: params.type,
        title: params.title,
        message: params.message,
        dedupeKey: params.dedupeKey,
        emailSent,
      },
    });

    if (params.emailTo && params.emailSubject && params.emailHtml) {
      await sendEmail({
        to: params.emailTo,
        subject: params.emailSubject,
        html: params.emailHtml,
      });
    }

    return true;
  } catch (err: unknown) {
    // Catch unique constraint collision (Prisma error code P2002)
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return false; // Deduped concurrently
    }
    console.error('[NotificationLog] Failed to create notification:', err);
    throw err;
  }
}
