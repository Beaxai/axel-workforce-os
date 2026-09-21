-- Safe producer application activity feed. Apply explicitly; this migration
-- performs no backfill and does not infer historical actors or milestones.
CREATE TABLE IF NOT EXISTS producer_registration_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  registration_id uuid NOT NULL REFERENCES producer_registrations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_producer_registration_activity_feed
  ON producer_registration_activity(registration_id, created_at);
CREATE INDEX IF NOT EXISTS idx_producer_registration_activity_org
  ON producer_registration_activity(org_id);

CREATE OR REPLACE FUNCTION enforce_producer_activity_scope()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM producer_registrations
    WHERE id = NEW.registration_id AND org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'producer activity registration is outside organization scope'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF NEW.actor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM org_members
    WHERE user_id = NEW.actor_id AND org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'producer activity actor is outside organization scope'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_producer_activity_scope
  ON producer_registration_activity;
CREATE TRIGGER trg_producer_activity_scope
BEFORE INSERT OR UPDATE OF org_id, registration_id, actor_id
ON producer_registration_activity
FOR EACH ROW EXECUTE FUNCTION enforce_producer_activity_scope();