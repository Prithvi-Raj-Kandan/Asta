-- Base PostgreSQL Schema for Asta (Synthesized from SQLAlchemy DeferredReflection models)
-- Run this before 001_stage_b_d.sql and 002_overhaul.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  CREATE TYPE output_format AS ENUM ('pdf', 'csv', 'xlsx');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE obligation_category AS ENUM ('gst', 'export');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE frequency AS ENUM ('monthly', 'quarterly', 'annually', 'per_transaction');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS state_codes (
  gstcode text PRIMARY KEY,
  statename text NOT NULL,
  stateabbreviation text,
  region text
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  passwordhash text NOT NULL,
  businessname text NOT NULL,
  businesstype text NOT NULL,
  state text,
  statecode text,
  sector text,
  employeecount integer DEFAULT 0,
  annualturnover text,
  exportenabled boolean DEFAULT false,
  onboardingcomplete boolean DEFAULT false,
  gstin text,
  phone text,
  createdat timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users_simple (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  business_name text NOT NULL,
  business_type text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userid uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  filetype text,
  filesizebytes integer DEFAULT 0,
  status text NOT NULL DEFAULT 'complete',
  documenttype text,
  filepath text,
  rawtext text,
  extracteddata jsonb,
  ocrconfidence numeric(5,2),
  confidencescores jsonb,
  createdat timestamptz DEFAULT CURRENT_TIMESTAMP,
  completedat timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userid uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  documenttype text NOT NULL,
  sourcetype text DEFAULT 'manual',
  invoicenumber text NOT NULL,
  invoicedate date,
  partyname text,
  partytype text,
  buyername text,
  buyergstin text,
  sellername text,
  sellergstin text,
  placeofsupply text,
  supplytype text,
  taxablevalue numeric(14,2) DEFAULT 0,
  cgstamount numeric(14,2) DEFAULT 0,
  sgstamount numeric(14,2) DEFAULT 0,
  igstamount numeric(14,2) DEFAULT 0,
  totalvalue numeric(14,2) DEFAULT 0,
  filingperiod text,
  rawtext text,
  status text DEFAULT 'confirmed',
  confirmedat timestamptz,
  reversecharge boolean DEFAULT false,
  isexport boolean DEFAULT false,
  originalfilepath text,
  createdat timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoiceid uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  linenumber integer NOT NULL DEFAULT 1,
  description text,
  hsnsaccode text,
  quantity numeric(14,2) DEFAULT 1,
  unit text DEFAULT 'NOS',
  unitprice numeric(14,2) DEFAULT 0,
  taxablevalue numeric(14,2) DEFAULT 0,
  gstrate numeric(6,2) DEFAULT 0,
  cgstrate numeric(6,2) DEFAULT 0,
  sgstrate numeric(6,2) DEFAULT 0,
  igstrate numeric(6,2) DEFAULT 0,
  cgstamount numeric(14,2) DEFAULT 0,
  sgstamount numeric(14,2) DEFAULT 0,
  igstamount numeric(14,2) DEFAULT 0,
  linetotal numeric(14,2) DEFAULT 0,
  uqc text DEFAULT 'NOS',
  discountamount numeric(14,2) DEFAULT 0,
  isnilrated boolean DEFAULT false,
  isexempted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS hsn_master (
  hsncode text PRIMARY KEY,
  description text NOT NULL,
  gstrate numeric(6,2) NOT NULL DEFAULT 18.0,
  category text,
  effectivefrom date
);

CREATE TABLE IF NOT EXISTS compliance_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userid uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  obligationtype text NOT NULL,
  category text NOT NULL DEFAULT 'gst',
  frequency text NOT NULL DEFAULT 'monthly',
  periodlabel text,
  duedate date,
  status text NOT NULL DEFAULT 'upcoming',
  datacomplete boolean DEFAULT false,
  filedon date,
  filingreference text,
  alertsent7d boolean DEFAULT false,
  alertsent1d boolean DEFAULT false,
  notes text
);

CREATE TABLE IF NOT EXISTS documents_generated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userid uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  documenttype text NOT NULL,
  templateversion text DEFAULT '1.0',
  inputdata jsonb,
  filingperiod text,
  shipmentref text,
  outputfilepath text,
  outputformat text,
  filesizebytes integer DEFAULT 0,
  status text DEFAULT 'complete',
  invoiceid uuid,
  obligationid uuid,
  generationtriggeredby text,
  expirydate date,
  isdeleted boolean DEFAULT false,
  generatedat timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  submitted_at timestamptz,
  submission_status text,
  external_reference text,
  payload_snapshot jsonb
);

CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userid uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sessionid text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  intent text,
  agentused text,
  toolscalled jsonb,
  createdat timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Seed common Indian GST State Codes
INSERT INTO state_codes (gstcode, statename, stateabbreviation, region) VALUES
  ('29', 'Karnataka', 'KA', 'South'),
  ('27', 'Maharashtra', 'MH', 'West'),
  ('33', 'Tamil Nadu', 'TN', 'South'),
  ('36', 'Telangana', 'TG', 'South'),
  ('07', 'Delhi', 'DL', 'North'),
  ('24', 'Gujarat', 'GJ', 'West')
ON CONFLICT (gstcode) DO NOTHING;

-- Seed common HSN Master codes
INSERT INTO hsn_master (hsncode, description, gstrate, category, effectivefrom) VALUES
  ('8483', 'Transmission shafts, precision CNC gears, bearing housings', 18.00, 'Machinery & Mechanical Appliances', '2017-07-01'),
  ('8537', 'Industrial PLC control panels and switchgear assemblies', 18.00, 'Electrical Machinery', '2017-07-01'),
  ('7326', 'Precision forged steel industrial brackets and fasteners', 18.00, 'Articles of Iron or Steel', '2017-07-01'),
  ('9031', 'Optical laser alignment & metrology inspection instruments', 18.00, 'Measuring & Checking Instruments', '2017-07-01'),
  ('998313', 'Industrial automation IT consulting & firmware integration', 18.00, 'Professional & Technical Services', '2017-07-01')
ON CONFLICT (hsncode) DO NOTHING;
