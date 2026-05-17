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
- Database models are intentionally left as placeholders; you mentioned you created the PostgreSQL schema — I can map SQLAlchemy models to your PostgreSQL tables next.
