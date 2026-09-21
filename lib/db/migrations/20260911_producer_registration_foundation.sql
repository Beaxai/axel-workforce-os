-- Additive producer-registration foundation. Apply explicitly to Development.
-- This migration does not rename, alter, copy, or backfill agent_registrations.
-- It intentionally creates no endpoint, worker, seed data, or production hook.

DO $$ BEGIN
  CREATE TYPE producer_registration_decision AS ENUM ('pending', 'approved', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE producer_registration_document_type AS ENUM (
    'agency_license', 'eo_certificate', 'section_1033_consent', 'other',
    'executed_packet', 'w9', 'ach_authorization'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE producer_registration_document_source AS ENUM ('applicant_upload', 'signwell');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE producer_registration_ingestion_status AS ENUM (
    'pending', 'processing', 'blocked', 'completed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE producer_registration_job_type AS ENUM ('ingest', 'send_packet', 'notify_staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE producer_registration_job_status AS ENUM (
    'pending', 'processing', 'blocked', 'completed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS producer_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  legacy_registration_id uuid REFERENCES agent_registrations(id) ON DELETE RESTRICT,
  reference text NOT NULL,
  source text NOT NULL,
  payload jsonb NOT NULL,
  agency_id uuid REFERENCES agencies(id) ON DELETE RESTRICT,
  principal_partner_id uuid REFERENCES partners(id) ON DELETE RESTRICT,
  signwell_envelope_id text,
  calendly_event_uri text,
  calendly_invitee_uri text,
  submitted_at timestamptz NOT NULL,
  packet_sent_at timestamptz,
  packet_signed_at timestamptz,
  call_scheduled_for timestamptz,
  call_completed_at timestamptz,
  call_notes text,
  decision producer_registration_decision NOT NULL DEFAULT 'pending',
  decided_at timestamptz,
  decided_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  countersigned_at timestamptz,
  credentials_issued_at timestamptz,
  decline_reason text,
  flags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_producer_registration_reference
    CHECK (reference ~ '^AXR-[0-9]{8}-[A-Za-z0-9]{6}$'),
  CONSTRAINT chk_producer_registration_decision_fields CHECK (
    (decision = 'pending' AND decided_at IS NULL AND decided_by IS NULL AND decline_reason IS NULL)
    OR
    (decision = 'approved' AND decided_at IS NOT NULL AND decided_by IS NOT NULL
      AND decline_reason IS NULL AND packet_signed_at IS NOT NULL AND call_completed_at IS NOT NULL)
    OR
    (decision = 'declined' AND decided_at IS NOT NULL AND decided_by IS NOT NULL
      AND nullif(btrim(decline_reason), '') IS NOT NULL)
  ),
  CONSTRAINT chk_producer_registration_countersign_gate CHECK (
    countersigned_at IS NULL
    OR (decision = 'approved' AND packet_signed_at IS NOT NULL AND call_completed_at IS NOT NULL)
  ),
  CONSTRAINT chk_producer_registration_credentials_gate CHECK (
    credentials_issued_at IS NULL
    OR (decision = 'approved' AND call_completed_at IS NOT NULL AND countersigned_at IS NOT NULL)
  ),
  CONSTRAINT chk_producer_registration_approval_links CHECK (
    (agency_id IS NULL AND principal_partner_id IS NULL) OR decision = 'approved'
  ),
  CONSTRAINT chk_producer_registration_call_notes CHECK (
    call_completed_at IS NULL OR nullif(btrim(call_notes), '') IS NOT NULL
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_producer_registrations_reference
  ON producer_registrations(reference);
CREATE UNIQUE INDEX IF NOT EXISTS uq_producer_registrations_legacy_registration
  ON producer_registrations(legacy_registration_id)
  WHERE legacy_registration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_producer_registrations_org
  ON producer_registrations(org_id);

CREATE TABLE IF NOT EXISTS producer_registration_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES producer_registrations(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  ownership_pct numeric(5,2) NOT NULL,
  npn text,
  resident_state text,
  email text NOT NULL,
  signwell_recipient_id text,
  exhibit_a_signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_producer_registration_owner_pct
    CHECK (ownership_pct >= 0 AND ownership_pct <= 100)
);
CREATE INDEX IF NOT EXISTS idx_producer_registration_owners_registration
  ON producer_registration_owners(registration_id);

CREATE TABLE IF NOT EXISTS producer_registration_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES producer_registrations(id) ON DELETE CASCADE,
  doc_type producer_registration_document_type NOT NULL,
  storage_key text,
  filename text,
  content_type text,
  size bigint,
  sha256 text,
  uploaded_at timestamptz,
  source producer_registration_document_source NOT NULL,
  ingestion_status producer_registration_ingestion_status NOT NULL DEFAULT 'pending',
  ingestion_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_producer_registration_document_size CHECK (size IS NULL OR size >= 0),
  CONSTRAINT chk_producer_registration_document_sha256
    CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT chk_producer_registration_document_ingested CHECK (
    ingestion_status <> 'completed'
    OR (storage_key IS NOT NULL AND filename IS NOT NULL AND content_type IS NOT NULL
      AND size IS NOT NULL AND sha256 IS NOT NULL AND uploaded_at IS NOT NULL)
  ),
  CONSTRAINT chk_producer_registration_document_error_code
    CHECK (ingestion_error_code IS NULL OR ingestion_error_code ~ '^[A-Z0-9_]{1,80}$')
);
CREATE INDEX IF NOT EXISTS idx_producer_registration_documents_registration
  ON producer_registration_documents(registration_id);

CREATE TABLE IF NOT EXISTS producer_registration_job_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES producer_registrations(id) ON DELETE CASCADE,
  job_type producer_registration_job_type NOT NULL,
  status producer_registration_job_status NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz,
  next_retry_at timestamptz,
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_producer_registration_job_attempts CHECK (attempt_count >= 0),
  CONSTRAINT chk_producer_registration_job_lease
    CHECK (status = 'processing' OR lease_expires_at IS NULL),
  CONSTRAINT chk_producer_registration_job_completion
    CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
  CONSTRAINT chk_producer_registration_job_error_code
    CHECK (last_error_code IS NULL OR last_error_code ~ '^[A-Z0-9_]{1,80}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_producer_registration_job_intent
  ON producer_registration_job_intents(registration_id, job_type);
CREATE INDEX IF NOT EXISTS idx_producer_registration_job_claim
  ON producer_registration_job_intents(status, available_at, next_retry_at);

CREATE OR REPLACE FUNCTION reject_producer_registration_payload_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payload IS DISTINCT FROM OLD.payload THEN
    RAISE EXCEPTION 'producer registration payload is immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_producer_registration_payload_immutable'
      AND tgrelid = 'producer_registrations'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_producer_registration_payload_immutable
    BEFORE UPDATE OF payload ON producer_registrations
    FOR EACH ROW EXECUTE FUNCTION reject_producer_registration_payload_update();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION touch_producer_registration_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_producer_registrations_updated_at'
      AND tgrelid = 'producer_registrations'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_producer_registrations_updated_at
    BEFORE UPDATE ON producer_registrations
    FOR EACH ROW EXECUTE FUNCTION touch_producer_registration_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_producer_registration_owners_updated_at'
      AND tgrelid = 'producer_registration_owners'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_producer_registration_owners_updated_at
    BEFORE UPDATE ON producer_registration_owners
    FOR EACH ROW EXECUTE FUNCTION touch_producer_registration_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_producer_registration_documents_updated_at'
      AND tgrelid = 'producer_registration_documents'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_producer_registration_documents_updated_at
    BEFORE UPDATE ON producer_registration_documents
    FOR EACH ROW EXECUTE FUNCTION touch_producer_registration_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_producer_registration_jobs_updated_at'
      AND tgrelid = 'producer_registration_job_intents'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_producer_registration_jobs_updated_at
    BEFORE UPDATE ON producer_registration_job_intents
    FOR EACH ROW EXECUTE FUNCTION touch_producer_registration_updated_at();
  END IF;
END $$;