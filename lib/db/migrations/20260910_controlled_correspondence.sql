-- Additive controlled-correspondence rollout. Apply only to Development
-- first; it contains no seed trust decision and no destructive operation.
CREATE TABLE IF NOT EXISTS trusted_axel_organizations (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE RESTRICT,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS correspondence_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  deal_market_id uuid REFERENCES deal_markets(id) ON DELETE CASCADE,
  participant_user_id uuid,
  channel text NOT NULL,
  listener_email text NOT NULL UNIQUE,
  subject_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_correspondence_market_thread
  ON correspondence_threads(deal_market_id)
  WHERE channel = 'MARKET' AND deal_market_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_correspondence_broker_thread
  ON correspondence_threads(deal_id, participant_user_id)
  WHERE channel = 'BROKER' AND participant_user_id IS NOT NULL;

ALTER TABLE deal_inbound_emails
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'HELD',
  ADD COLUMN IF NOT EXISTS to_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cc_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS correspondence_thread_id uuid,
  ADD COLUMN IF NOT EXISTS provider_received_email_id text,
  ADD COLUMN IF NOT EXISTS body_enrichment_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS body_enrichment_error text,
  ADD COLUMN IF NOT EXISTS held_reason text,
  ADD COLUMN IF NOT EXISTS sender_auth_evidence text;
ALTER TABLE deal_outbound_emails
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'MARKET',
  ADD COLUMN IF NOT EXISTS correspondence_thread_id uuid,
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inbound_provider_received_id
  ON deal_inbound_emails(provider_received_email_id)
  WHERE provider_received_email_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_outbound_idempotency_key
  ON deal_outbound_emails(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Historical rows are deliberately HELD, never auto-exposed. Market history
-- gets a safe market channel label only; no recipient/listener is inferred.
UPDATE deal_inbound_emails
SET channel = CASE WHEN deal_market_id IS NULL THEN 'HELD' ELSE 'MARKET' END
WHERE channel = 'HELD';
UPDATE deal_inbound_emails
SET provider_received_email_id = message_id
WHERE provider_received_email_id IS NULL
  AND message_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
UPDATE deal_outbound_emails
SET channel = CASE WHEN deal_market_id IS NULL THEN 'BROKER' ELSE 'MARKET' END
WHERE channel = 'MARKET';