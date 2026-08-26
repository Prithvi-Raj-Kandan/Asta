"""Apply SQL migrations and seed reference data."""
from __future__ import annotations

import logging
import re
from datetime import date
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

STATE_CODES = [
    ("01", "Jammu and Kashmir", "JK"),
    ("02", "Himachal Pradesh", "HP"),
    ("03", "Punjab", "PB"),
    ("04", "Chandigarh", "CH"),
    ("05", "Uttarakhand", "UK"),
    ("06", "Haryana", "HR"),
    ("07", "Delhi", "DL"),
    ("08", "Rajasthan", "RJ"),
    ("09", "Uttar Pradesh", "UP"),
    ("10", "Bihar", "BR"),
    ("11", "Sikkim", "SK"),
    ("12", "Arunachal Pradesh", "AR"),
    ("13", "Nagaland", "NL"),
    ("14", "Manipur", "MN"),
    ("15", "Mizoram", "MZ"),
    ("16", "Tripura", "TR"),
    ("17", "Meghalaya", "ML"),
    ("18", "Assam", "AS"),
    ("19", "West Bengal", "WB"),
    ("20", "Jharkhand", "JH"),
    ("21", "Odisha", "OD"),
    ("22", "Chhattisgarh", "CG"),
    ("23", "Madhya Pradesh", "MP"),
    ("24", "Gujarat", "GJ"),
    ("27", "Maharashtra", "MH"),
    ("29", "Karnataka", "KA"),
    ("30", "Goa", "GA"),
    ("32", "Kerala", "KL"),
    ("33", "Tamil Nadu", "TN"),
    ("34", "Puducherry", "PY"),
    ("36", "Telangana", "TS"),
    ("37", "Andhra Pradesh", "AP"),
]

HSN_STARTER = [
    ("1001", "Wheat and meslin", 0, "Goods"),
    ("1701", "Cane or beet sugar", 5, "Goods"),
    ("2201", "Waters, including natural or artificial mineral waters", 18, "Goods"),
    ("2710", "Petroleum oils", 18, "Goods"),
    ("3004", "Medicaments", 12, "Goods"),
    ("3926", "Other articles of plastics", 18, "Goods"),
    ("6109", "T-shirts, singlets and other vests, knitted", 5, "Goods"),
    ("8471", "Automatic data processing machines", 18, "Goods"),
    ("8517", "Telephone sets, including smartphones", 18, "Goods"),
    ("9403", "Other furniture and parts thereof", 18, "Goods"),
    ("998314", "Information technology consulting", 18, "Services"),
    ("998311", "Management consulting", 18, "Services"),
    ("995411", "Construction services of buildings", 18, "Services"),
    ("996511", "Road transport services of goods", 5, "Services"),
    ("997212", "Rental services of commercial property", 18, "Services"),
]


def _add_enum_value(conn, enum_name: str, value: str) -> None:
    exists = conn.execute(
        text(
            """
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = :enum_name AND e.enumlabel = :value
            """
        ),
        {"enum_name": enum_name, "value": value},
    ).first()
    if exists:
        return
    # ALTER TYPE ... ADD VALUE cannot run inside a multi-statement transaction in some setups;
    # use AUTOCOMMIT connection for this.
    conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE '{value}'"))


def run_migrations(engine) -> None:
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        _add_enum_value(conn, "output_format", "csv")
        _add_enum_value(conn, "output_format", "xlsx")

        conn.execute(
            text(
                """
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
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS agent_jobs_userid_idx ON agent_jobs(userid)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS agent_jobs_created_idx ON agent_jobs(created_at)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS knowledge_chunks (
                  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                  source text NOT NULL,
                  content text NOT NULL,
                  embedding vector(1536),
                  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
                  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx ON knowledge_chunks(source)"))
        try:
            conn.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw
                    ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
                    """
                )
            )
        except Exception as exc:
            logger.warning("HNSW index create skipped: %s", exc)

    logger.info("Migrations applied")


def seed_reference_data(db: Session) -> None:
    for code, name, abbr in STATE_CODES:
        exists = db.execute(text("SELECT 1 FROM state_codes WHERE gstcode = :c"), {"c": code}).first()
        if not exists:
            db.execute(
                text(
                    """
                    INSERT INTO state_codes (gstcode, statename, stateabbreviation, region)
                    VALUES (:c, :n, :a, NULL)
                    """
                ),
                {"c": code, "n": name, "a": abbr},
            )

    today = date.today().isoformat()
    for hsn, desc, rate, category in HSN_STARTER:
        exists = db.execute(text("SELECT 1 FROM hsn_master WHERE hsncode = :h"), {"h": hsn}).first()
        if not exists:
            db.execute(
                text(
                    """
                    INSERT INTO hsn_master (hsncode, description, gstrate, category, effectivefrom)
                    VALUES (:h, :d, :r, :cat, :ef)
                    """
                ),
                {"h": hsn, "d": desc, "r": rate, "cat": category, "ef": today},
            )
    db.commit()
