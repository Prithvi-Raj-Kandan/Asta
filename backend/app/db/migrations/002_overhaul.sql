-- Phase 2.2: Obligation Catalog
CREATE TABLE IF NOT EXISTS obligation_catalog (
  obligation_type text PRIMARY KEY,
  category text NOT NULL,
  frequency text NOT NULL,
  due_rule text NOT NULL,
  data_required text NOT NULL,
  portal_name text,
  portal_url text,
  guide_url text,
  instructions text NOT NULL
);

-- Phase 2.4: Government News
CREATE TABLE IF NOT EXISTS govt_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  published_at timestamptz,
  summary text NOT NULL,
  raw_text text NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  content_hash text UNIQUE NOT NULL
);

-- Phase 2.5: Filing file vault on Compliance page
ALTER TABLE documents_generated ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE documents_generated ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE documents_generated ADD COLUMN IF NOT EXISTS submission_status text;
ALTER TABLE documents_generated ADD COLUMN IF NOT EXISTS external_reference text;
ALTER TABLE documents_generated ADD COLUMN IF NOT EXISTS payload_snapshot jsonb;

-- Phase 5.1: Filing attempts
CREATE TABLE IF NOT EXISTS filing_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at timestamptz,
  request_body jsonb,
  response_body jsonb,
  status text NOT NULL
);
