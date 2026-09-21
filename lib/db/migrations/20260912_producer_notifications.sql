-- Additive, provider-free producer appointment notification outbox.
-- Applying this migration does not enable delivery or start a worker.

DO $$ BEGIN
  CREATE TYPE producer_notification_event AS ENUM (
    'registration_received', 'packet_sent', 'exhibit_a_request',
    'call_reminder', 'scheduling_nudge', 'approved_countersigned',
    'credentials_issued', 'declined', 'new_registration',
    'ready_for_decision', 'packet_declined_or_expired', 'unmatched_booking',
    'countersign_needed', 'scheduling_link', 'booking_canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE producer_notification_status AS ENUM (
    'blocked', 'pending', 'sending', 'sent', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS producer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  registration_id uuid REFERENCES producer_registrations(id) ON DELETE CASCADE,
  event producer_notification_event NOT NULL,
  dedupe_key text NOT NULL,
  recipient_emails text[] NOT NULL,
  template_data jsonb NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  text text NOT NULL,
  status producer_notification_status NOT NULL DEFAULT 'blocked',
  failure_code text,
  attempt_count integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  next_retry_at timestamptz,
  sending_started_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_producer_notifications_dedupe_key
    CHECK (nullif(btrim(dedupe_key), '') IS NOT NULL),
  CONSTRAINT chk_producer_notifications_recipients
    CHECK (cardinality(recipient_emails) > 0),
  CONSTRAINT chk_producer_notifications_attempt_count
    CHECK (attempt_count >= 0),
  CONSTRAINT chk_producer_notifications_failure_code
    CHECK (failure_code IS NULL OR failure_code ~ '^[A-Z0-9_]{1,80}$'),
  CONSTRAINT chk_producer_notifications_sent_at
    CHECK ((status = 'sent') = (sent_at IS NOT NULL)),
  CONSTRAINT chk_producer_notifications_sending_started
    CHECK (status = 'sending' OR sending_started_at IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_producer_notifications_org_dedupe
  ON producer_notifications(org_id, dedupe_key);
CREATE INDEX IF NOT EXISTS idx_producer_notifications_registration
  ON producer_notifications(registration_id);
CREATE INDEX IF NOT EXISTS idx_producer_notifications_delivery
  ON producer_notifications(status, available_at, next_retry_at);

CREATE OR REPLACE FUNCTION enforce_producer_notification_registration_scope()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.registration_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM producer_registrations
    WHERE id = NEW.registration_id AND org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'producer notification registration is outside organization scope'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_producer_notification_registration_scope
  ON producer_notifications;
CREATE TRIGGER trg_producer_notification_registration_scope
BEFORE INSERT OR UPDATE OF org_id, registration_id ON producer_notifications
FOR EACH ROW EXECUTE FUNCTION enforce_producer_notification_registration_scope();

CREATE OR REPLACE FUNCTION touch_producer_notification_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_producer_notification_updated_at
  ON producer_notifications;
CREATE TRIGGER trg_producer_notification_updated_at
BEFORE UPDATE ON producer_notifications
FOR EACH ROW EXECUTE FUNCTION touch_producer_notification_updated_at();