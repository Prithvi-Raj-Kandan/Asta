-- Stage B/D migrations for Asta
-- Safe to re-run

DO $$ BEGIN
  ALTER TYPE output_format ADD VALUE IF NOT EXISTS 'csv';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE output_format ADD VALUE IF NOT EXISTS 'xlsx';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS agent_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userid uuid NOT NULL REFERENCES users(id),
  intent text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  input jsonb,
  result jsonb,
  agents_used text[],
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS agent_jobs_userid_idx ON agent_jobs(userid);
CREATE INDEX IF NOT EXISTS agent_jobs_created_idx ON agent_jobs(created_at);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx ON knowledge_chunks(source);
