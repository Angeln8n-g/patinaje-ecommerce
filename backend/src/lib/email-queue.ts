/**
 * Simple async email queue.
 * Decouples email sending from HTTP request lifecycle.
 * Emails are queued in memory and processed asynchronously with retry logic.
 *
 * For production at scale, replace with BullMQ + Redis.
 */
import { Resend } from "resend";
import { logger } from "./logger.js";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailJob {
  from: string;
  to: string;
  subject: string;
  html: string;
  retries: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const queue: EmailJob[] = [];
let processing = false;

/**
 * Enqueue an email to be sent asynchronously.
 * Returns immediately — the email is sent in the background.
 */
export function enqueueEmail(params: { from: string; to: string; subject: string; html: string }) {
  queue.push({ ...params, retries: 0 });
  logger.debug({ to: params.to, subject: params.subject }, "Email enqueued");
  processQueue();
}

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    const job = queue.shift()!;
    try {
      await resend.emails.send({
        from: job.from,
        to: job.to,
        subject: job.subject,
        html: job.html,
      });
      logger.info({ to: job.to, subject: job.subject }, "Email sent successfully");
    } catch (err) {
      if (job.retries < MAX_RETRIES) {
        job.retries++;
        logger.warn({ to: job.to, attempt: job.retries, err }, "Email send failed, retrying");
        queue.push(job);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        logger.error({ to: job.to, subject: job.subject, err }, "Email send failed permanently after retries");
      }
    }
  }

  processing = false;
}
