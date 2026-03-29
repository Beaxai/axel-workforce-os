-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ========================
-- CORE TABLES
-- ========================

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  vertical text,
  naics_code text,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  metadata jsonb
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  phone text,
  mobile text,
  avatar_url text,
  notification_preference text DEFAULT 'EMAIL',
  status text DEFAULT 'PENDING_APPROVAL',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  org_id uuid REFERENCES organizations(id),
  role text NOT NULL,
  permissions jsonb,
  is_primary_org boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ========================
-- QUOTING + PIPELINE TABLES
-- ========================

CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text UNIQUE NOT NULL,
  org_id uuid REFERENCES organizations(id),
  owner_id uuid REFERENCES users(id),
  producing_agent_id uuid REFERENCES users(id),
  referral_partner_id uuid REFERENCES users(id),
  stage text DEFAULT 'NEW_LEAD',
  product_type text,
  vertical text,
  state text,
  employee_count_ft integer,
  employee_count_pt integer,
  annual_payroll numeric(18,2),
  estimated_premium numeric(18,2),
  wc_premium numeric(18,2),
  wfs_pepm_rate numeric(10,2),
  wfs_pepm_monthly numeric(10,2),
  wfs_pepm_annual numeric(10,2),
  total_annual_combined numeric(18,2),
  emod numeric(4,3),
  years_in_business integer,
  fein text,
  entity_type text,
  website text,
  description_of_operations text,
  multiple_locations boolean DEFAULT false,
  number_of_locations integer,
  multiple_states boolean DEFAULT false,
  states_of_operation text[],
  non_renewed boolean DEFAULT false,
  lapse_in_coverage boolean DEFAULT false,
  date_of_lapse date,
  deal_email_address text UNIQUE,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  metadata jsonb
);

CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id),
  phase text,
  status text DEFAULT 'DRAFT',
  class_codes jsonb,
  loss_runs jsonb,
  wc_indication_min numeric(18,2),
  wc_indication_mid numeric(18,2),
  wc_indication_max numeric(18,2),
  wc_final_premium numeric(18,2),
  peo_pepm numeric(10,2),
  peo_annual_total numeric(18,2),
  rating_breakdown jsonb,
  ai_risk_score numeric(4,2),
  ai_risk_factors jsonb,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ========================
-- POLICY + AMS TABLES
-- ========================

CREATE TABLE policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id),
  org_id uuid REFERENCES organizations(id),
  carrier_org_id uuid REFERENCES organizations(id),
  policy_number text UNIQUE,
  policy_type text,
  status text DEFAULT 'BOUND',
  effective_date date,
  expiration_date date,
  estimated_premium numeric(18,2),
  current_premium numeric(18,2),
  wfs_pepm_rate numeric(10,2),
  coverage_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id),
  policy_id uuid REFERENCES policies(id),
  producer_id uuid REFERENCES users(id),
  agency_id uuid REFERENCES organizations(id),
  gross_premium numeric(18,2),
  producer_rate numeric(5,4),
  producer_amount numeric(18,2),
  agency_override_rate numeric(5,4) DEFAULT 0,
  agency_override_amount numeric(18,2) DEFAULT 0,
  wfs_override_monthly numeric(10,2) DEFAULT 0,
  net_to_ais numeric(18,2),
  status text DEFAULT 'PENDING',
  paid_date timestamptz,
  statement_period text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE policy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id),
  policy_id uuid REFERENCES policies(id),
  document_type text,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  generated_by_system boolean DEFAULT false,
  requires_signature boolean DEFAULT false,
  signature_status text,
  signature_envelope_id text,
  signed_at timestamptz,
  source text DEFAULT 'MANUAL',
  sender_email text,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- ========================
-- CRM TABLES
-- ========================

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  deal_id uuid REFERENCES deals(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  mobile text,
  title text,
  role text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  body text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id),
  library_task_id uuid,
  task_name text NOT NULL,
  category text,
  assigned_to uuid REFERENCES users(id),
  due_date date,
  priority text DEFAULT 'MEDIUM',
  status text DEFAULT 'OPEN',
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id),
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE task_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  task_name text NOT NULL,
  default_assignee_role text,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ========================
-- DEAL EMAIL TABLES
-- ========================

CREATE TABLE deal_email_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) UNIQUE,
  email_address text NOT NULL UNIQUE,
  company_slug text NOT NULL,
  file_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE deal_inbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id),
  message_id text NOT NULL,
  from_email text NOT NULL,
  from_name text,
  subject text,
  body_html text,
  body_text text,
  ai_summary text,
  ai_intent text,
  ai_action_items jsonb,
  received_at timestamptz NOT NULL,
  processed_at timestamptz
);

CREATE TABLE task_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id),
  deal_id uuid REFERENCES deals(id),
  sent_to_email text,
  sent_to_phone text,
  delivery_method text NOT NULL,
  sent_by uuid REFERENCES users(id),
  sent_at timestamptz DEFAULT now(),
  message_body text
);

-- ========================
-- IMPLEMENTATION TRACKER
-- ========================

CREATE TABLE implementation_trackers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) UNIQUE,
  policy_id uuid REFERENCES policies(id),
  product_type text NOT NULL,
  go_live_date date NOT NULL,
  status text DEFAULT 'IN_PROGRESS',
  assigned_specialist uuid REFERENCES users(id),
  overall_progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE implementation_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id uuid REFERENCES implementation_trackers(id),
  phase_number integer NOT NULL,
  phase_name text NOT NULL,
  target_date date NOT NULL,
  status text DEFAULT 'PENDING',
  completed_at timestamptz
);

CREATE TABLE implementation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid REFERENCES implementation_phases(id),
  tracker_id uuid REFERENCES implementation_trackers(id),
  task_name text NOT NULL,
  task_type text NOT NULL,
  owner_type text NOT NULL,
  owner_id uuid,
  status text DEFAULT 'PENDING',
  is_milestone boolean DEFAULT false,
  milestone_triggers text,
  blocked_since timestamptz,
  reminder_sent_at timestamptz,
  due_date date,
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id),
  sort_order integer NOT NULL
);

-- ========================
-- AGENT REGISTRATION
-- ========================

CREATE TABLE agent_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text NOT NULL,
  agency_dba text,
  agency_address text NOT NULL,
  agency_phone text NOT NULL,
  agency_website text,
  agency_npn text,
  states_licensed jsonb,
  lines_of_authority jsonb,
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  email text NOT NULL,
  phone text NOT NULL,
  individual_npn text,
  license_numbers jsonb,
  eo_carrier text NOT NULL,
  eo_policy_number text NOT NULL,
  eo_coverage_amount numeric(18,2) NOT NULL,
  eo_expiration_date date NOT NULL,
  eo_certificate_url text NOT NULL,
  status text DEFAULT 'PENDING_REVIEW',
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  decline_reason text,
  agreement_envelope_id text,
  agreement_sent_at timestamptz,
  agreement_signed_at timestamptz,
  agreement_url text,
  zoom_scheduled_at timestamptz,
  zoom_completed_at timestamptz,
  onboarding_admin_id uuid REFERENCES users(id),
  referral_source text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE agent_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id uuid REFERENCES organizations(id),
  compliance_type text NOT NULL,
  state text,
  expiration_date date NOT NULL,
  document_url text,
  status text DEFAULT 'ACTIVE',
  reminder_90_sent boolean DEFAULT false,
  reminder_30_sent boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- ========================
-- RATE TABLES
-- ========================

CREATE TABLE rate_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier text NOT NULL,
  state text NOT NULL,
  class_code text NOT NULL,
  class_description text NOT NULL,
  base_rate numeric(8,4) NOT NULL,
  effective_date date NOT NULL,
  expiration_date date,
  vertical text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE pepm_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  employee_band_min integer NOT NULL,
  employee_band_max integer,
  pepm_rate numeric(10,2) NOT NULL,
  product_type text NOT NULL,
  effective_date date NOT NULL,
  is_active boolean DEFAULT true
);

-- ========================
-- ONBOARDING CHECKLIST
-- ========================

CREATE TABLE onboarding_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) UNIQUE,
  step_1_status text DEFAULT 'NOT_STARTED',
  step_1_completed_at timestamptz,
  step_2_status text DEFAULT 'NOT_STARTED',
  step_2_completed_at timestamptz,
  step_3_status text DEFAULT 'NOT_STARTED',
  step_3_scheduled_at timestamptz,
  step_3_completed_at timestamptz,
  step_4_status text DEFAULT 'NOT_STARTED',
  step_4_completed_at timestamptz,
  step_5_status text DEFAULT 'NOT_STARTED',
  step_5_completed_at timestamptz,
  step_6_status text DEFAULT 'NOT_STARTED',
  step_6_completed_at timestamptz,
  current_step integer DEFAULT 1,
  completed_at timestamptz
);

-- ========================
-- WORKFORCE TABLES
-- ========================

CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  hire_date date,
  termination_date date,
  status text DEFAULT 'ACTIVE',
  job_title text,
  department text,
  wc_class_code text,
  state text,
  pay_type text,
  pay_rate numeric(18,2),
  ytd_earnings numeric(18,2),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE workforce_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) UNIQUE,
  snapshot_date date NOT NULL,
  total_employees integer DEFAULT 0,
  ft_employees integer DEFAULT 0,
  pt_employees integer DEFAULT 0,
  total_annual_payroll numeric(18,2) DEFAULT 0,
  ytd_payroll numeric(18,2) DEFAULT 0,
  new_hires_mtd integer DEFAULT 0,
  terminations_mtd integer DEFAULT 0,
  open_claims_count integer DEFAULT 0,
  experience_modifier numeric(4,3),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE vertical_workforce_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  snapshot_date date NOT NULL,
  client_count integer DEFAULT 0,
  total_employees integer DEFAULT 0,
  total_payroll numeric(18,2) DEFAULT 0,
  total_premium numeric(18,2) DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- ========================
-- INDEXES
-- ========================

CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_vertical ON deals(vertical);
CREATE INDEX idx_deals_state ON deals(state);
CREATE INDEX idx_deals_producing_agent ON deals(producing_agent_id);
CREATE INDEX idx_activity_log_deal ON activity_log(deal_id, created_at);
CREATE INDEX idx_rate_tables_lookup ON rate_tables(state, class_code, carrier);
CREATE INDEX idx_deal_email ON deal_email_addresses(email_address);
CREATE INDEX idx_rate_tables_trgm ON rate_tables USING gin(class_description gin_trgm_ops);

-- ========================
-- RATE LOOKUP FUNCTION
-- ========================

CREATE OR REPLACE FUNCTION get_base_rate(
  p_state text,
  p_class_code text
) RETURNS numeric AS $$
  SELECT base_rate
  FROM rate_tables
  WHERE state = p_state
    AND class_code = p_class_code
    AND carrier = 'Benchmark Insurance Company'
    AND is_active = true
  ORDER BY effective_date DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ========================
-- ROW LEVEL SECURITY
-- ========================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (for server-side operations)
CREATE POLICY "Service role bypass" ON organizations
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON users
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON deals
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON quotes
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON policies
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON commissions
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON policy_documents
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON contacts
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON notes
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON tasks
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON activity_log
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON employees
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON org_members
  FOR ALL USING (auth.role() = 'service_role');