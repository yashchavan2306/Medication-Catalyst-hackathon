import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Creates a Nodemailer transporter.
 * Falls back to json/mock transport if test mode or no credentials provided.
 */
function createTransporter() {
  if (env.NODE_ENV === 'test' || !env.SMTP_USER) {
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

const transporter = createTransporter();

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email notification.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: env.FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    return true;
  } catch (error) {
    console.warn('[EmailService] Failed to send email:', error);
    return false;
  }
}
