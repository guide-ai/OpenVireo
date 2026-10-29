import { isLoopbackOrigin, requestIsLoopback, type Env } from './env';

export type EmailMessage = Readonly<{ to: string; subject: string; text: string }>;

/** Email sending. Choosing a real provider is a later user decision (docs/BACKEND-LOCAL.md); it becomes a second
 * implementation of this interface and nothing else changes. */
export interface EmailSender { send(message: EmailMessage): Promise<void> }

/** The only implementation: logs the message and keeps it in dev_outbox for the local Playwright flow. */
export class DevSinkSender implements EmailSender {
  constructor(private readonly db: D1Database) {}
  async send(message: EmailMessage): Promise<void> {
    console.log(`[dev email sink] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}`);
    await this.db.prepare('INSERT INTO dev_outbox (to_email, subject, body, created_at) VALUES (?, ?, ?, ?)')
      .bind(message.to, message.subject, message.text, Date.now()).run();
  }
}

/** The dev sink is honoured only with EMAIL_MODE=dev-sink, a loopback APP_ORIGIN **and** a request that actually
 * arrived on a loopback host (review 1 M2): configuration alone never enables it. Otherwise there is no sender. */
export function devSinkEnabled(env: Env, request: Request): boolean {
  return env.EMAIL_MODE === 'dev-sink' && isLoopbackOrigin(env.APP_ORIGIN) && requestIsLoopback(request);
}

export function emailSender(env: Env, request: Request): EmailSender | null {
  return devSinkEnabled(env, request) ? new DevSinkSender(env.DB) : null;
}
