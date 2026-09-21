-- Additive Calendly webhook inbox and current producer-booking projection.
-- Applying this migration does not create provider subscriptions or configuration.

CREATE TABLE IF NOT EXISTS producer_calendly_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES trusted_axel_organizations(org_id) ON DELETE RESTRICT,
  registration_id uuid REFERENCES producer_registrations(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  payload_hash text NOT NULL,
  invitee_uri text,
  scheduled_event_uri text,
  source_event_at timestamptz NOT NULL,
  outcome text NOT NULL,
  sanitized_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  staff_needs_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_producer_calendly_events_hash
    CHECK (payload_hash ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_producer_calendly_events_hash
  ON producer_calendly_events(payload_hash);
CREATE INDEX IF NOT EXISTS idx_producer_calendly_events_invitee_time
  ON producer_calendly_events(invitee_uri, source_event_at);
CREATE INDEX IF NOT EXISTS idx_producer_calendly_events_review
  ON producer_calendly_events(staff_needs_review, created_at);

CREATE TABLE IF NOT EXISTS producer_calendly_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES producer_registrations(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES trusted_axel_organizations(org_id) ON DELETE RESTRICT,
  event_uri text NOT NULL,
  invitee_uri text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  meeting_url text,
  source_event_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_producer_calendly_bookings_registration
  ON producer_calendly_bookings(registration_id);
CREATE INDEX IF NOT EXISTS idx_producer_calendly_bookings_org_active
  ON producer_calendly_bookings(org_id, active);

CREATE OR REPLACE FUNCTION enforce_producer_calendly_registration_scope()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.registration_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM producer_registrations
    WHERE id = NEW.registration_id AND org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'producer Calendly registration is outside organization scope'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_producer_calendly_event_registration_scope
  ON producer_calendly_events;
CREATE TRIGGER trg_producer_calendly_event_registration_scope
BEFORE INSERT OR UPDATE OF org_id, registration_id ON producer_calendly_events
FOR EACH ROW EXECUTE FUNCTION enforce_producer_calendly_registration_scope();

DROP TRIGGER IF EXISTS trg_producer_calendly_booking_registration_scope
  ON producer_calendly_bookings;
CREATE TRIGGER trg_producer_calendly_booking_registration_scope
BEFORE INSERT OR UPDATE OF org_id, registration_id ON producer_calendly_bookings
FOR EACH ROW EXECUTE FUNCTION enforce_producer_calendly_registration_scope();