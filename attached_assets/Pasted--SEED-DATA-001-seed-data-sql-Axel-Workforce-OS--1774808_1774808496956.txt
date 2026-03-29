-- ========================
-- SEED DATA
-- 001_seed_data.sql
-- Axel Workforce OS
-- ========================

-- ========================
-- INTERNAL ORGANIZATION
-- ========================

INSERT INTO organizations (id, name, type, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Axel Workforce Solutions', 'INTERNAL', 'ACTIVE');

-- ========================
-- TASK LIBRARY
-- ========================

-- Underwriting Tasks
INSERT INTO task_library (category, task_name, default_assignee_role) VALUES
  ('Underwriting', 'Verify producer license (NIPR)', 'UNDERWRITER'),
  ('Underwriting', 'Confirm E&O certificate on file', 'UNDERWRITER'),
  ('Underwriting', 'Review loss runs — 3 year history', 'UNDERWRITER'),
  ('Underwriting', 'Verify EMod against NCCI', 'UNDERWRITER'),
  ('Underwriting', 'Confirm class codes match operations', 'UNDERWRITER'),
  ('Underwriting', 'Review owners/officers exclusions', 'UNDERWRITER'),
  ('Underwriting', 'Check prior carrier history', 'UNDERWRITER'),
  ('Underwriting', 'Validate payroll by class code', 'UNDERWRITER'),
  ('Underwriting', 'Schedule underwriting call', 'UNDERWRITER'),
  ('Underwriting', 'Request additional information from broker', 'UNDERWRITER'),
  ('Underwriting', 'Issue formal quote', 'UNDERWRITER'),
  ('Underwriting', 'Issue declination letter', 'UNDERWRITER'),
  ('Underwriting', 'Issue referral to specialty market', 'UNDERWRITER');

-- Operations Tasks
INSERT INTO task_library (category, task_name, default_assignee_role) VALUES
  ('Operations', 'Generate quote proposal PDF', 'INTERNAL_SALES'),
  ('Operations', 'Send proposal to broker', 'INTERNAL_SALES'),
  ('Operations', 'Request bind authority from carrier', 'UNDERWRITER'),
  ('Operations', 'Generate binder', 'UNDERWRITER'),
  ('Operations', 'Send CSA for e-signature', 'INTERNAL_SALES'),
  ('Operations', 'Confirm down payment received', 'INTERNAL_SALES'),
  ('Operations', 'Request policy issuance', 'UNDERWRITER'),
  ('Operations', 'Upload policy jacket to document vault', 'INTERNAL_SALES'),
  ('Operations', 'Issue COI to client', 'INTERNAL_SALES'),
  ('Operations', 'Schedule onboarding call', 'INTERNAL_SALES');

-- Compliance Tasks
INSERT INTO task_library (category, task_name, default_assignee_role) VALUES
  ('Compliance', 'Verify surplus lines stamping required', 'UNDERWRITER'),
  ('Compliance', 'Confirm state licensing for all parties', 'ADMIN'),
  ('Compliance', 'Verify FEIN number', 'INTERNAL_SALES'),
  ('Compliance', 'Confirm multi-state exposure handled', 'UNDERWRITER');

-- Cannabis-Specific Tasks
INSERT INTO task_library (category, task_name, default_assignee_role) VALUES
  ('Cannabis', 'Verify state cannabis license', 'UNDERWRITER'),
  ('Cannabis', 'Confirm extraction method documentation', 'UNDERWRITER'),
  ('Cannabis', 'Review security plan', 'UNDERWRITER'),
  ('Cannabis', 'Validate dispensary/grow/processing split', 'UNDERWRITER');

-- ========================
-- PEPM RATES
-- Kind PEO Program — Cannabis Vertical
-- 2% of total org annual payroll ÷ 12 = monthly WFS fee
-- Rate stored as percentage (0.02 = 2%)
-- ========================

INSERT INTO pepm_rates (vertical, employee_band_min, employee_band_max, pepm_rate, product_type, effective_date) VALUES
  ('CANNABIS', 1,   10,  0.02, 'PEO', '2026-01-01'),
  ('CANNABIS', 11,  25,  0.02, 'PEO', '2026-01-01'),
  ('CANNABIS', 26,  50,  0.02, 'PEO', '2026-01-01'),
  ('CANNABIS', 51,  100, 0.02, 'PEO', '2026-01-01'),
  ('CANNABIS', 101, NULL, 0.02, 'PEO', '2026-01-01'),
  ('CANNABIS', 1,   10,  0.02, 'ASO', '2026-01-01'),
  ('CANNABIS', 11,  25,  0.02, 'ASO', '2026-01-01'),
  ('CANNABIS', 26,  50,  0.02, 'ASO', '2026-01-01'),
  ('CANNABIS', 51,  100, 0.02, 'ASO', '2026-01-01'),
  ('CANNABIS', 101, NULL, 0.02, 'ASO', '2026-01-01');

-- Placeholder rates for other verticals (update when rates are confirmed)
INSERT INTO pepm_rates (vertical, employee_band_min, employee_band_max, pepm_rate, product_type, effective_date) VALUES
  ('CONSTRUCTION',      1, NULL, 0.02, 'PEO', '2026-01-01'),
  ('STAFFING',          1, NULL, 0.02, 'PEO', '2026-01-01'),
  ('TRANSPORTATION',    1, NULL, 0.02, 'PEO', '2026-01-01'),
  ('HEALTHCARE',        1, NULL, 0.02, 'PEO', '2026-01-01'),
  ('WASTE_MANAGEMENT',  1, NULL, 0.02, 'PEO', '2026-01-01'),
  ('AMBULANCE',         1, NULL, 0.02, 'PEO', '2026-01-01'),
  ('ROOFING',           1, NULL, 0.02, 'PEO', '2026-01-01'),
  ('MANUFACTURING',     1, NULL, 0.02, 'PEO', '2026-01-01');

-- ========================
-- VERTICAL WORKFORCE ROLLUPS
-- Initialize with zero values for all 10 verticals
-- ========================

INSERT INTO vertical_workforce_rollups (vertical, snapshot_date, client_count, total_employees, total_payroll, total_premium) VALUES
  ('CANNABIS',           CURRENT_DATE, 0, 0, 0, 0),
  ('CONSTRUCTION',       CURRENT_DATE, 0, 0, 0, 0),
  ('STAFFING',           CURRENT_DATE, 0, 0, 0, 0),
  ('TRANSPORTATION',     CURRENT_DATE, 0, 0, 0, 0),
  ('HEALTHCARE',         CURRENT_DATE, 0, 0, 0, 0),
  ('WASTE_MANAGEMENT',   CURRENT_DATE, 0, 0, 0, 0),
  ('AMBULANCE',          CURRENT_DATE, 0, 0, 0, 0),
  ('ROOFING',            CURRENT_DATE, 0, 0, 0, 0),
  ('MANUFACTURING',      CURRENT_DATE, 0, 0, 0, 0),
  ('HIGH_EXPERIENCE_MOD',CURRENT_DATE, 0, 0, 0, 0);