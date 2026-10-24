# Asta

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white)

**Asta** is an SME GST compliance co-pilot. It turns invoice PDFs and scans into reviewable books, tracks GSTR-1, GSTR-3B, LUT, and IEC obligations, and prepares a GSTR-1 payload that a person approves before it is saved and filed through the Sandbox.co.in GST API.

> **Best Final-Year Project Award (October 2026)**  
> Global Academy of Technology, Bengaluru

The live client is [`frontend_v2`](frontend_v2). The API is a FastAPI service in [`backend`](backend) that reflects a PostgreSQL schema, including `pgvector` for retrieval over the bundled GST notes.

## Walkthrough

The recording below is the October 2026 session for **Kandan Precision Components Pvt Ltd** (Karnataka): the financial dashboard, the invoice book, the compliance tracker, and Asta preparing a GSTR-1 payload in the Review & File drawer.

![Asta walkthrough: dashboard, invoices, compliance tracker, and Review and File](docs/assets/asta-demo.gif)

A still of the same dashboard, with the compliance health score, outward-supply chart, deadline alerts, and the co-pilot:

![Asta financial dashboard and compliance co-pilot](docs/assets/asta-preview.png)

The original capture is also stored at [`docs/assets/asta-demo.mp4`](docs/assets/asta-demo.mp4) (1280×800, 14.6 seconds).

## Why GST compliance is hard for a small firm

An Indian manufacturer or trader files outward supplies on **GSTR-1** (commonly the 11th of the following month) and pays tax on **GSTR-3B** (commonly the 20th). Export businesses also keep a Letter of Undertaking and an Importer-Exporter Code current. The work that slips is ordinary and expensive:

- Invoice PDFs and phone photos do not match the portal’s column layout, so someone retypes GSTIN, invoice number, taxable value, and rate.
- A GSTIN is a 15-character identifier whose first two digits are the state code. A mistyped character, or a buyer GSTIN taken from the seller’s copy, lands in the wrong B2B row.
- HSN/SAC codes carry the rate. The rate on the bill and the rate in the firm’s memory diverge, especially across goods and services.
- Intra-state supplies are CGST + SGST. Inter-state supplies and many exports are IGST (exports are often zero-rated). Mixing the two produces a return that does not match the books.
- GSTR-1 and GSTR-3B deadlines are easy to miss when the calendar lives in a spreadsheet.

Asta keeps that path inside one product: ingest the document, extract a GSTR-1-shaped draft, confirm it into PostgreSQL, score the open obligations, and hold the generated payload for a person to edit before Sandbox submission.

## Architecture

```mermaid
flowchart LR
  subgraph client [frontend_v2]
    Dash[Dashboard and analytics]
    Books[Invoices sales purchases]
    UpUI[Document upload]
    Track[Compliance tracker]
    Copilot[Asta chat and Review and File]
  end

  subgraph api [FastAPI /api/v1]
    UpAPI[Uploads]
    InvAPI[Invoices]
    AnAPI[Analytics]
    CompAPI[Compliance]
    FileAPI[Filings]
    ChatAPI[Chat]
  end

  subgraph ingest [Ingestion]
    MuPDF[PyMuPDF text layer]
    Tess[Tesseract OCR]
    Fields[GSTR-1 field extractor]
  end

  subgraph agents [Agents]
    Orch[MetaOrchestrator]
    Doc[Document generator]
    Dead[Deadline tracker]
    Map[Compliance mapper]
    Gemini[Gemini tool calling]
  end

  DB[(PostgreSQL plus pgvector)]
  Sandbox[Sandbox.co.in]

  client --> api
  UpAPI --> MuPDF --> Tess --> Fields --> DB
  ChatAPI --> Orch
  ChatAPI --> Gemini
  Orch --> Doc
  Orch --> Dead
  Orch --> Map
  Gemini --> Doc
  Map --> DB
  Dead --> DB
  FileAPI --> Doc
  FileAPI --> Sandbox
  AnAPI --> DB
  InvAPI --> DB
```

```mermaid
sequenceDiagram
  participant User
  participant UI as frontend_v2
  participant API as POST /api/v1/chat
  participant Gen as DocumentGeneratorAgent
  participant Sandbox as Sandbox.co.in

  User->>UI: Generate GSTR-1
  UI->>API: message
  API->>Gen: rows for YYYY-MM
  API-->>UI: reply and action_type review_filing
  UI->>API: POST /filings/gstr1/preview
  API-->>UI: editable row JSON
  User->>UI: Approve and Submit
  UI->>API: POST /filings/gstr1/sandbox-file
  API->>Sandbox: save GSTR-1 rows
  API->>Sandbox: file with reference_id
  API-->>UI: status message acknowledgement_number
```

### 1. Document ingestion

Upload is `POST /api/v1/uploads/` with a file and a `document_type` (`sale_bill`, purchase bill, credit note, debit note, and the other types the upload screen offers). The file is stored under `backend/uploads/`.

`LocalOCRService` (`backend/app/services/ocr.py`) reads it locally:

1. **PDF with a text layer.** PyMuPDF (`fitz`) extracts page text. A page with at least 80 characters is kept at confidence 1.0 and is not sent to OCR.
2. **Scanned PDF page.** The page is rasterized at 3× and passed to **Tesseract** (`pytesseract`). Word confidences are averaged for the page.
3. **Images.** PNG, JPEG, WebP, BMP, and TIFF go straight to Tesseract after a Pillow pre-process.
4. **Fallback.** If a PDF yields no pages, pdfplumber supplies the text.

`GSTR1ExtractionService` (`backend/app/services/extraction.py`) then fills a draft row with deterministic patterns: GSTIN, trade name, invoice number, date, taxable value, invoice value, GST rate, cess, place of supply, reverse charge, invoice type, and e-commerce GSTIN. Empty fields become `ExtractionIssue`s. The upload screen shows that draft for edit. **Confirm and Save** writes an `invoices` row and one `invoice_line_items` row.

Gemini is the chat and embedding model. It is not on the OCR path.

### 2. GST identifiers, HSN reference data, and tax amounts

The extractor keeps a GSTIN when it matches the statutory 15-character layout:

```text
\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]
```

That is a two-digit state-code prefix, a PAN-shaped body, an entity character, `Z`, and a final check character. On a sales document with several GSTINs, the buyer line is preferred over the first match. State names for that prefix live in `state_codes` (six codes in the base migration; the API startup seed fills a wider Indian list).

`hsn_master` stores code, description, GST rate, and category. The compliance mapper searches it with `ILIKE` on the code or description and returns the stored rate with the answer. The base migration seeds five industrial HSN/SAC rows (8483, 8537, 7326, 9031, 998313). Startup adds a separate starter set when those codes are absent.

On confirm, tax is computed from the draft rate times taxable value, or from invoice total minus taxable value when the rate is missing. The amount is stored as equal **CGST** and **SGST**, with **IGST** at 0. Place of supply is stored on the invoice. The books therefore have separate CGST, SGST, and IGST columns for the dashboard and for later edits; the confirm path itself always writes the intra-state split.

The compliance mapper also reports GSTR-1 readiness for a supplied invoice list: at least one invoice, no missing party GSTIN, and no missing total.

### 3. Compliance co-pilot

Chat is `POST /api/v1/chat/` with `{ message, session_id }`. Two mechanisms run:

**Routing.** `MetaOrchestrator.classify_intent` sends the text to one of `ocr`, `document_generate`, `deadlines`, `compliance`, or `chat`, using keywords (or an explicit intent). `POST /api/v1/agents/run` executes that route and stores the job in `agent_jobs`.

**Gemini tool calling.** When `GEMINI_API_KEY` is set, `LLMService.chat_with_tools` calls Gemini (`gemini-3.8-flash` by default, then `GEMINI_FALLBACK_MODELS`) with three tools from `ChatTools`:

| Tool | Effect |
| --- | --- |
| `prepare_gstr1_filing(period)` | Builds the GSTR-1 rows for `YYYY-MM` and tells the user to open Review & File. It does not submit. |
| `get_financial_summary()` | Sales, purchases, the highest sale, and open obligations for the signed-in firm. |
| `get_recent_compliance_news(limit)` | Latest rows from `govt_news`. |

A message that asks for GSTR-1 is also handled directly: the document generator runs, and the response sets `action_type` to `review_filing` with the filing period. The UI then shows **Review & File (YYYY-MM)**.

**Retrieval.** `ensure_knowledge_indexed` chunks `backend/app/knowledge/faq.md` and `gst_deadlines.md` (about 900 characters each) and stores embeddings in `knowledge_chunks.embedding vector(1536)`. The embedding model is `gemini-embedding-001`, L2-normalized. Retrieval orders by pgvector cosine distance (`<=>`) and returns four chunks. If the key is missing or the embedding call fails, retrieval falls back to `ILIKE`. `POST /api/v1/chat/index-knowledge` rebuilds the index.

**Human review, then Sandbox.** The Review & File sheet loads `POST /api/v1/filings/gstr1/preview`. The editor is the row JSON. **Approve & Submit** posts those rows to `POST /api/v1/filings/gstr1/sandbox-file`. `SandboxGspClient` authenticates at `{SANDBOX_BASE_URL}/authenticate`, saves `{"rows": [...]}` to `/gst/compliance/tax-payer/gstrs/gstr-1/{year}/{month}`, then files with `{ "reference_id": ... }` on the `/file` path. Each attempt is written to `filing_attempts`. The response includes `status`, `message`, and `acknowledgement_number`.

Generated CSV/XLSX files use the twelve portal-style headers in `GSTR1_HEADERS` (the date header is stored with its leading space, matching the generator):

```text
GSTIN/UIN, Trade Name, Invoice No, " Date of Invoice", Invoice Value, GST%,
Taxable Value, CESS, Place Of Supply, RCM Applicable, Invoice Type, E-Commerce GSTIN
```

`POST /api/v1/filings/gstr1/export` downloads CSV or XLSX. Export obligations (LUT, IEC, shipping bill) download a PDF draft from `POST /api/v1/filings/export-docs/export`.

Quick prompts in the co-pilot are **Generate GSTR-1**, **Check Deadlines**, **Revenue Analysis**, and **GSTR-3B tips**.

### 4. Health score and obligation tracker

`calculate_health_score` in `backend/app/services/health_score.py` starts at 100:

| Condition | Points |
| --- | --- |
| Each open obligation with status `overdue` | −25 |
| Each open obligation with status `due_soon` (due within 7 days) | −10 |
| Each other open obligation | −2 |
| Zero invoices on the books | −15 |
| Fewer than five invoices | −5 |
| No open obligations and at least one invoice | +5 |

The score is clamped to 0–100. **80+** is Healthy, **50–79** is Needs Attention, and **below 50** is Critical. The recorded session’s **78 / Needs Attention** sits in that middle band. The same object is returned by:

- `GET /api/v1/analytics/summary` (dashboard and analytics)
- `GET /api/v1/compliance/obligations`
- `GET /api/v1/compliance/notifications`

`DeadlineTrackerAgent.seed_monthly_obligations` creates, per month, GSTR-1 (11th of the next month), GSTR-3B (20th of the next month), LUT (31 March of that year), and IEC (30 June of that year). The tracker UI calls `POST /api/v1/compliance/obligations/seed` with `months_ahead: 3` on load. **Mark Filed** is `POST /api/v1/compliance/obligations/{id}/filed`.

Analytics sales totals count document types `sales_invoice` and `export_invoice`. Purchases count `purchase_invoice`. The dashboard chart is `sales_by_month` for the last six months.

## Tech stack

| Layer | Choice in this repo |
| --- | --- |
| API | FastAPI, Pydantic v2, Uvicorn. Global prefix `/api/v1`. |
| Data | PostgreSQL, SQLAlchemy synchronous sessions, deferred reflection. `psycopg2`. |
| Vectors | `pgvector` column `vector(1536)`, cosine distance. Python package `pgvector`. |
| OCR | PyMuPDF, pdfplumber, Pillow, Tesseract (`pytesseract`). |
| Model | `google-genai`. Chat model `gemini-3.8-flash` with fallbacks. Embeddings `gemini-embedding-001`. |
| Filing | `httpx` client for Sandbox.co.in (`test-api.sandbox.co.in` by default). |
| Documents | CSV via the stdlib, XLSX via openpyxl, PDF drafts via reportlab. |
| Auth | `users_simple` for login, mirrored into `users` for invoice ownership. Passwords hashed with scrypt. JWT HS256, 30-minute access token. |
| Web | React 18.3, TypeScript, Vite 6.3, React Router 7, Tailwind CSS 4, Radix UI, Recharts 2.15, Sonner toasts. |
| Legacy UI | `frontend/` is an earlier static demo. It does not call the API. |

## Repository layout

```text
.
├── README.md
├── LICENSE
├── Architecture.jpeg              # earlier architecture sketch
├── backend/
│   ├── app/
│   │   ├── main.py                # CORS, startup migrations, seed
│   │   ├── api/api_v1/endpoints/  # auth, uploads, invoices, filings, chat, ...
│   │   ├── agents/                # orchestrator, OCR, documents, deadlines, mapper, chat tools
│   │   ├── services/              # OCR, extraction, health score, RAG, Gemini, Sandbox
│   │   ├── knowledge/             # faq.md, gst_deadlines.md
│   │   └── db/
│   │       ├── bootstrap.py       # idempotent DDL + reference seed at startup
│   │       └── migrations/
│   │           ├── 001_stage_b_d.sql
│   │           └── 002_overhaul.sql
│   ├── migrations/
│   │   └── 000_base_schema.sql    # fresh-database base tables, enums, starter rows
│   ├── requirements.txt
│   └── tests/test_smoke.py
├── frontend_v2/                   # live React client
├── frontend/                      # static Stage 2 demo
├── docs/assets/                   # preview PNG, walkthrough GIF and MP4
└── postman/                       # API collection
```

Reflected tables after the three SQL files: `state_codes`, `users`, `users_simple`, `extraction_jobs`, `invoices`, `invoice_line_items`, `hsn_master`, `compliance_obligations`, `documents_generated`, `chat_history`, `agent_jobs`, `knowledge_chunks`, `obligation_catalog`, `govt_news`, `filing_attempts`.

## HTTP API

All routes except `GET /` live under `/api/v1`. Protected routes expect `Authorization: Bearer <token>`.

| Method | Path | Role |
| --- | --- | --- |
| GET | `/` | Liveness message |
| GET | `/health/` | Database ping |
| POST | `/auth/register` | Create `users_simple`, mirror `users`, return a JWT |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Current profile |
| POST | `/uploads/` | Store file, OCR, return a draft |
| GET | `/uploads/` | Up to five recent uploads |
| GET | `/uploads/{id}` | One draft |
| GET | `/uploads/{id}/file` | Original file |
| POST | `/uploads/{id}/confirm` | Draft to invoice |
| GET | `/invoices/` | Invoice list (falls back to unconfirmed drafts) |
| POST | `/invoices/` | Manual invoice |
| POST | `/invoices/confirm` | Confirm a draft without an upload id |
| GET | `/invoices/{id}` | Detail |
| GET | `/invoices/{id}/source-file` | Source PDF or image |
| PATCH | `/invoices/{id}` | Partial update |
| DELETE | `/invoices/{id}` | Delete invoice and files |
| POST | `/agents/run` | Run the orchestrator |
| GET | `/agents/jobs/{job_id}` | Job row |
| POST | `/filings/gstr1/preview` | Rows for a period |
| POST | `/filings/gstr1/export` | CSV or XLSX download |
| GET | `/filings/gstr1/files/{filename}` | Download a generated `gstr1_*` file |
| POST | `/filings/export-docs/export` | LUT, IEC, or shipping-bill PDF |
| POST | `/filings/gstr1/sandbox-file` | Save and file on Sandbox.co.in |
| GET | `/compliance/obligations` | Obligations, alerts, health score |
| POST | `/compliance/obligations/seed` | Seed upcoming months |
| POST | `/compliance/obligations/{id}/filed` | Mark filed |
| GET | `/compliance/notifications` | Alerts and health score |
| POST | `/chat/` | Co-pilot turn |
| POST | `/chat/index-knowledge` | Rebuild the vector index |
| GET | `/analytics/summary` | Sales, purchases, tax, monthly series, health score |
| GET | `/news/` | Compliance news (seeds sample rows when the table is empty) |
| GET | `/files/generated/documents` | Filing vault |
| GET | `/files/{id}/metadata` | Extraction-job metadata |
| GET | `/files/{id}/documents` | Documents linked to a job |

The React client calls the auth, upload, invoice, filing, compliance, chat, analytics, and news routes. Its base URL is fixed at `http://localhost:8000/api/v1` in `frontend_v2/src/api/client.ts`.

## Local setup

Tested path: **PostgreSQL 16.15** with **pgvector 0.6.0**, **Python 3.12**, and the three SQL files below. Applying them twice is safe: the second run reports “already exists” and does not duplicate seed rows.

### 1. System packages

Ubuntu / Debian:

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib postgresql-16-pgvector tesseract-ocr python3-venv
```

The `pgvector` package name follows the server major version (`postgresql-16-pgvector` on PostgreSQL 16). Tesseract must be on the path. The OCR service looks for `/usr/bin/tesseract`, `/usr/local/bin/tesseract`, and the usual Windows install paths.

You also need **Node.js 20+** for `frontend_v2` (this repo’s Vite is 6.3).

Create a database owned by a user you can put in `DATABASE_URL`:

```bash
sudo -u postgres psql -c "CREATE USER asta WITH PASSWORD 'asta';"
sudo -u postgres psql -c "CREATE DATABASE asta OWNER asta;"
```

### 2. Apply the schema

From the repository root, in this order:

```bash
psql "postgresql://asta:asta@localhost:5432/asta" -v ON_ERROR_STOP=1 -f backend/migrations/000_base_schema.sql
psql "postgresql://asta:asta@localhost:5432/asta" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/001_stage_b_d.sql
psql "postgresql://asta:asta@localhost:5432/asta" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/002_overhaul.sql
```

| File | What it creates |
| --- | --- |
| `backend/migrations/000_base_schema.sql` | Extensions `pgcrypto` and `vector`. Enums `output_format`, `obligation_category`, `frequency`. Base books tables. Six state codes and five HSN rows. |
| `backend/app/db/migrations/001_stage_b_d.sql` | `agent_jobs`, `knowledge_chunks` (`vector(1536)`), and `csv` / `xlsx` on `output_format`. |
| `backend/app/db/migrations/002_overhaul.sql` | `obligation_catalog`, `govt_news`, `filing_attempts`, and filing columns on `documents_generated`. |

`000_base_schema.sql` already includes `csv` and `xlsx` on the enum and the filing columns on `documents_generated`. The later files use `IF NOT EXISTS` / duplicate-value handlers, so the chain still applies on a fresh database. On PostgreSQL 16.15 this produced 15 tables, extensions `pgcrypto` 1.3 and `vector` 0.6.0, 6 state codes, and 5 HSN rows.

The API does not execute those `.sql` files itself. On startup, `backend/app/db/bootstrap.py` re-applies the extension DDL (jobs, vectors, catalog, news, filing attempts) and seeds a wider `state_codes` list, extra HSN rows, and the obligation catalog (GSTR-1, GSTR-3B, LUT, IEC, shipping bill). The base tables from `000_base_schema.sql` have to exist first: startup alters `documents_generated` and then reflects the live schema.

### 3. Backend environment

Settings load **`backend/.env`** (`backend/app/core/config.py`). Copy the example and edit it:

```bash
cp backend/.env.example backend/.env
```

```bash
DATABASE_URL=postgresql+psycopg2://asta:asta@localhost:5432/asta
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODELS=gemini-3.6-flash,gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIM=1536

SANDBOX_BASE_URL=https://test-api.sandbox.co.in
SANDBOX_API_KEY=
SANDBOX_API_SECRET=
```

Use the `postgresql+psycopg2` scheme. `requirements.txt` installs `psycopg2-binary`, and a bare `postgresql://` URL is handed to the psycopg v3 dialect by current SQLAlchemy.

`GEMINI_API_KEY` is optional for boot and for OCR. It is required for co-pilot answers, embeddings, and `POST /chat/index-knowledge`. `SANDBOX_API_KEY` and `SANDBOX_API_SECRET` are required only when you press **Approve & Submit**. Preview and CSV export work without them.

The repo-root `.env.example` is a wider template (`VITE_API_BASE_URL`, Zoho, Tally, and others). `frontend_v2` does not read `VITE_API_BASE_URL`; the client talks to `http://localhost:8000/api/v1`.

### 4. Run the API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Check the database:

```bash
curl -s http://localhost:8000/api/v1/health/
# {"status":"ok","db":"ok"}
```

Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs).

CORS allows `http://localhost:3000` and `http://localhost:5173` through `5176` (and the same hosts on `127.0.0.1`).

Register from the UI, or:

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"founder@kandan.example","password":"change-me-please","business_name":"Kandan Precision Components Pvt Ltd","business_type":"Manufacturer"}'
```

Registration writes `users_simple`, then copies that identity into `users` so invoices and obligations have an owner. Access tokens expire after 30 minutes. The signing secret in `backend/app/core/security.py` is a development constant; replace it before any shared deployment.

### 5. Run the web app

```bash
cd frontend_v2
npm ci
npm run dev
```

Vite serves the app at [http://localhost:5173](http://localhost:5173). Sign up, then:

1. **Upload** a PDF or image and confirm the draft.
2. Review **Invoices**, **Sales**, and **Purchases**.
3. Open **Compliance** to seed obligations, export a GSTR-1 CSV, or open Review & File.
4. Open **Asta** and use **Generate GSTR-1**. Edit the JSON in the drawer, then **Approve & Submit** once Sandbox credentials are set.

### 6. Smoke tests

From `backend/`, with the virtualenv active and `DATABASE_URL` set (the suite does not query the database; importing the app constructs the engine):

```bash
cd backend
DATABASE_URL='postgresql+psycopg2://asta:asta@localhost:5432/asta' python tests/test_smoke.py
```

The file checks orchestrator intent routing, GSTIN/invoice regex extraction, the twelve GSTR-1 CSV headers, and an OCR-agent draft built from raw text. On Python 3.12 with `requirements.txt` installed, that command prints `All smoke tests passed`.

## License

[MIT](LICENSE). Copyright (c) 2026 Prithvi.
