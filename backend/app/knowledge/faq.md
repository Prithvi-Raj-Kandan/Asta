# Asta Product FAQ

## What does Asta do?
Asta is an SME compliance co-pilot. Upload sales/purchase invoices (PDF or images), review OCR drafts, confirm them into your books, track GST deadlines, and export portal-ready GSTR-1 CSV/XLSX files.

## How does upload work?
1. Upload a PDF/JPG/PNG invoice.
2. OCR extracts text; the OCR agent builds a GSTR-1 style draft row.
3. You review/edit fields and confirm.
4. Confirmed rows appear under Sales / Purchases / Invoices.

## Can Asta file on the GST portal?
Not in the current MVP. You can export GSTR-1 files matching portal templates. WhiteBooks API filing is planned for a later stage.

## Which agents exist?
- Meta Orchestrator — routes intents
- OCR Agent — document text + field extraction
- Compliance Mapper — rules / HSN / readiness
- Document Generator — GSTR-1 CSV/XLSX
- Deadline Tracker — GSTR-1 / GSTR-3B obligations and alerts
