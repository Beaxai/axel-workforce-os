-- Development-only acceptance checks. Always rolls back all fixture writes.
-- Does not send email, enqueue a running worker, or modify legacy registrations.
BEGIN;
DO $$
DECLARE
  org uuid;
  reg uuid;
  fixture_reference text := 'AXR-20000101-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
BEGIN
  SELECT id INTO org FROM organizations LIMIT 1;
  IF org IS NULL THEN
    RAISE EXCEPTION 'Verification requires an existing organization';
  END IF;

  INSERT INTO producer_registrations (org_id, reference, source, payload, submitted_at)
    VALUES (org, fixture_reference, 'development_verification', '{"fixture":true}', now())
    RETURNING id INTO reg;
  INSERT INTO producer_registration_owners (registration_id, name, ownership_pct, email)
    VALUES (reg, 'Fictional Owner', 100, 'owner@example.test');
  INSERT INTO producer_registration_documents (registration_id, doc_type, source)
    VALUES (reg, 'agency_license', 'applicant_upload');
  INSERT INTO producer_registration_job_intents (registration_id, job_type)
    VALUES (reg, 'ingest');

  BEGIN
    INSERT INTO producer_registrations (org_id, reference, source, payload, submitted_at)
      VALUES (org, fixture_reference, 'development_verification', '{}', now());
    RAISE EXCEPTION 'FAIL: duplicate reference accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_registrations SET payload = '{"changed":true}' WHERE id = reg;
    RAISE EXCEPTION 'FAIL: payload modification accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_registrations SET decision = 'approved' WHERE id = reg;
    RAISE EXCEPTION 'FAIL: premature approval accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_registrations SET countersigned_at = now() WHERE id = reg;
    RAISE EXCEPTION 'FAIL: premature countersign accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_registrations SET credentials_issued_at = now() WHERE id = reg;
    RAISE EXCEPTION 'FAIL: premature credentials accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_registrations SET call_completed_at = now() WHERE id = reg;
    RAISE EXCEPTION 'FAIL: completed call without notes accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO producer_registration_owners (registration_id, name, ownership_pct, email)
      VALUES (reg, 'Invalid Owner', 101, 'invalid@example.test');
    RAISE EXCEPTION 'FAIL: ownership above 100 percent accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_registration_documents SET ingestion_status = 'completed'
      WHERE registration_id = reg;
    RAISE EXCEPTION 'FAIL: document completed without storage metadata';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO producer_registration_job_intents (registration_id, job_type)
      VALUES (reg, 'ingest');
    RAISE EXCEPTION 'FAIL: duplicate job intent accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_registration_job_intents SET last_error_code = 'Sensitive free text'
      WHERE registration_id = reg;
    RAISE EXCEPTION 'FAIL: arbitrary error text accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  IF (SELECT count(*) FROM producer_registration_owners WHERE registration_id = reg) <> 1
     OR (SELECT count(*) FROM producer_registration_documents WHERE registration_id = reg) <> 1
     OR (SELECT count(*) FROM producer_registration_job_intents WHERE registration_id = reg) <> 1 THEN
    RAISE EXCEPTION 'FAIL: fixture child records do not reconcile';
  END IF;
  RAISE NOTICE 'PASS: insertion, children, uniqueness, immutability, lifecycle, ownership, document and error-code constraints';
END $$;
ROLLBACK;