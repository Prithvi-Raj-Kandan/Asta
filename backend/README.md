# Backend (CS201) - Asta

This folder contains a minimal FastAPI scaffold for the Asta backend.

Quickstart

1. Create a Python environment and install dependencies:

```bash
python -m venv .venv
.\.venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string.

3. Start the dev server:

```bash
uvicorn app.main:app --reload --port 8000
```

API
- Health check: `GET /api/v1/health/`

Notes
- This scaffold uses synchronous SQLAlchemy sessions for simplicity. We can convert to async later if desired.
- Database models are now mapped through deferred reflection against your live PostgreSQL schema.
- Reflected tables currently include: `state_codes`, `users`, `extraction_jobs`, `invoices`, `invoice_line_items`, `hsn_master`, `compliance_obligations`, `documents_generated`, and `chat_history`.
- The next workflow ticket can call `backend.app.models.prepare_models()` before using ORM queries.
