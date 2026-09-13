/** A temporary Development endpoint must never replace the published secret. */
export function selectResendWebhookSecret(env: {
  NODE_ENV?: string;
  RESEND_DEV_WEBHOOK_SECRET?: string;
  RESEND_WEBHOOK_SECRET?: string;
}): string | undefined {
  return env.NODE_ENV === "development"
    ? env.RESEND_DEV_WEBHOOK_SECRET || env.RESEND_WEBHOOK_SECRET
    : env.RESEND_WEBHOOK_SECRET;
}