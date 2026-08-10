// Stripe integration for broker-fee payment links (Q14 resolved: Stripe).
// Fetch-based like emailService — no SDK dependency. If STRIPE_SECRET_KEY is
// missing or Stripe errors, callers fall back to the portal stub link so
// dunning is never blocked by the payment provider.

const STRIPE_API = "https://api.stripe.com/v1";

/**
 * Key selection: development uses STRIPE_SECRET_TEST_KEY (fake cards, no real
 * charges) when present; production uses STRIPE_SECRET_KEY (live). Falls back
 * to whichever exists so a missing test key never silently disables Stripe in dev.
 */
function stripeKey(): string | undefined {
  const live = process.env.STRIPE_SECRET_KEY;
  const test = process.env.STRIPE_SECRET_TEST_KEY;
  return process.env.NODE_ENV === "production" ? live || test : test || live;
}

function form(data: Record<string, string>): string {
  return new URLSearchParams(data).toString();
}

async function stripePost(path: string, data: Record<string, string>): Promise<any> {
  const key = stripeKey();
  if (!key) throw new Error("No Stripe key configured (STRIPE_SECRET_KEY / STRIPE_SECRET_TEST_KEY)");
  const resp = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form(data),
  });
  const body: any = await resp.json();
  if (!resp.ok) {
    throw new Error(`Stripe ${path} ${resp.status}: ${body?.error?.message || JSON.stringify(body)}`);
  }
  return body;
}

export function stripeConfigured(): boolean {
  return !!stripeKey();
}

/**
 * Create a durable Stripe Payment Link for a deal's broker fee.
 * Payment Links don't expire (unlike Checkout Sessions), so they're safe to
 * put in a dunning email that may be opened days later.
 * `amount` is in dollars; `dealId` rides in metadata so a future webhook can
 * auto-mark the fee PAID.
 * Returns the hosted link URL, or null if Stripe is not configured or errors
 * (callers fall back to the portal stub — dunning must never be blocked).
 */
export async function createBrokerFeePaymentLink(input: {
  dealId: string;
  businessName: string;
  amount: number; // dollars
}): Promise<string | null> {
  if (!stripeConfigured()) return null;
  const cents = Math.round(input.amount * 100);
  if (!Number.isFinite(cents) || cents <= 0) return null;
  try {
    // Payment Links require a Price object; create one inline with its product.
    const price = await stripePost("/prices", {
      currency: "usd",
      unit_amount: String(cents),
      "product_data[name]": `Axel broker fee — ${input.businessName}`.slice(0, 250),
      "product_data[metadata][dealId]": input.dealId,
    });
    const link = await stripePost("/payment_links", {
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
      "metadata[dealId]": input.dealId,
      "metadata[purpose]": "broker_fee",
    });
    return typeof link?.url === "string" ? link.url : null;
  } catch (err) {
    console.error(`[stripe] payment link for deal ${input.dealId} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}
