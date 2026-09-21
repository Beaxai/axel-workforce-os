-- Development-only verification. Fixture writes always roll back.
BEGIN;
DO $$
DECLARE
  organization uuid;
  other_organization uuid;
  registration uuid;
  fixture_reference text := 'AXR-20000102-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  event_hash text := repeat('f', 32) || replace(gen_random_uuid()::text, '-', '');
BEGIN
  SELECT org_id INTO organization FROM trusted_axel_organizations LIMIT 1;
  SELECT id INTO other_organization FROM organizations WHERE id <> organization LIMIT 1;
  IF organization IS NULL OR other_organization IS NULL THEN
    RAISE EXCEPTION 'Verification requires a trusted organization and a second organization';
  END IF;
  INSERT INTO producer_registrations (org_id, reference, source, payload, submitted_at)
    VALUES (organization, fixture_reference, 'operations_verification', '{}', now())
    RETURNING id INTO registration;
  INSERT INTO producer_registration_activity (org_id, registration_id, action)
    VALUES (organization, registration, 'TEST_REVIEW');
  INSERT INTO producer_calendly_events
    (org_id, registration_id, event_name, payload_hash, source_event_at, outcome)
    VALUES (organization, registration, 'invitee.created', event_hash, now(), 'matched');
  INSERT INTO producer_calendly_bookings
    (org_id, registration_id, event_uri, invitee_uri, scheduled_for, source_event_at)
    VALUES (organization, registration, 'https://api.calendly.com/scheduled_events/test',
      'https://api.calendly.com/scheduled_events/test/invitees/test', now(), now());
  INSERT INTO producer_notifications
    (org_id, registration_id, event, dedupe_key, recipient_emails,
      template_data, subject, html, text, failure_code)
    VALUES (organization, registration, 'scheduling_link', fixture_reference,
      ARRAY['fictional@example.test'], '{}', 'Test', '<p>Test</p>', 'Test', 'DELIVERY_NOT_ENABLED');

  BEGIN
    INSERT INTO producer_registration_activity (org_id, registration_id, action)
      VALUES (other_organization, registration, 'TEST_CROSS_ORG');
    RAISE EXCEPTION 'FAIL: cross-organization activity accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO producer_calendly_events
      (org_id, registration_id, event_name, payload_hash, source_event_at, outcome)
      VALUES (organization, registration, 'invitee.created', event_hash, now(), 'matched');
    RAISE EXCEPTION 'FAIL: duplicate provider event accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_calendly_bookings SET org_id = other_organization
      WHERE registration_id = registration;
    RAISE EXCEPTION 'FAIL: cross-organization booking accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_calendly_events SET org_id = other_organization
      WHERE registration_id = registration;
    RAISE EXCEPTION 'FAIL: cross-organization provider event accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_notifications SET org_id = other_organization
      WHERE registration_id = registration;
    RAISE EXCEPTION 'FAIL: cross-organization notification accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO producer_notifications
      (org_id, registration_id, event, dedupe_key, recipient_emails,
        template_data, subject, html, text)
      VALUES (organization, registration, 'scheduling_link', fixture_reference,
        ARRAY['fictional@example.test'], '{}', 'Test', '<p>Test</p>', 'Test');
    RAISE EXCEPTION 'FAIL: duplicate notification accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    UPDATE producer_notifications SET status = 'sent' WHERE registration_id = registration;
    RAISE EXCEPTION 'FAIL: sent status without timestamp accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  IF (SELECT status FROM producer_notifications WHERE registration_id = registration) <> 'blocked' THEN
    RAISE EXCEPTION 'FAIL: notification did not remain blocked';
  END IF;
END $$;
ROLLBACK;