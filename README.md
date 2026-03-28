# HAZOP Assistant Agent

**AI-Powered Process Safety Analysis -- Built with Gemini 2.5 Flash**

> **Categories:** AI Agents, Process Safety, Industrial AI
> Built with Gemini 2.5 Flash, Google GenAI SDK, FastAPI, React, openpyxl, reportlab

HAZOP Assistant automates Hazard and Operability studies by reading P&ID diagrams with Gemini Vision, generating physically credible deviations using a deterministic knowledge-base engine, and producing compliance-ready Excel worksheets and PDF reports -- all following IEC 61882 methodology.

---

## Demo Video

<div align="center">

[![HAZOP Assistant Agent Demo](https://img.youtube.com/vi/YRSl7tYnoB4/maxresdefault.jpg)](https://www.youtube.com/watch?v=YRSl7tYnoB4)

**[Watch the full demo on YouTube](https://www.youtube.com/watch?v=YRSl7tYnoB4)**

*Upload a P&ID diagram, AI identifies nodes, generates deviations, produces Excel & PDF reports*

</div>

---

## What We Built

HAZOP studies are the cornerstone of process safety in chemical, petrochemical, and oil & gas industries. A typical study takes a team of 6-8 engineers 2-4 weeks to complete manually. HAZOP Assistant reduces the initial analysis from weeks to minutes by:

1. **Reading P&ID diagrams with AI Vision** -- Gemini 2.5 Flash identifies equipment, instruments, streams, and control loops directly from uploaded P&ID images
2. **Generating only credible deviations** -- deterministic pre-filter produces ~10 deviations per node (not 30+ generic ones), following IEC 61882 guide word methodology
3. **Producing professional reports** -- Excel worksheets with risk-colored cells and PDF compliance reports with executive summary, risk matrix, and action items
4. **Answering questions from your data** -- AI chat assistant queries your actual study results, not generic textbook content

---

## Features

### P&ID Vision Analysis
- Upload any P&ID diagram (PNG, JPG, PDF)
- Gemini 2.5 Flash extracts equipment nodes, instrument tags, streams, and control instruments
- Works with simple separators (5 nodes) to complex distillation systems (16+ nodes)
- Structured JSON output with `response_mime_type: "application/json"` for reliable parsing
- SSE streaming pushes progress to the browser in real-time

### Smart Deviation Engine
- **Deterministic pre-filter**: `VALID_COMBOS` lookup table defines physically credible (guide_word, parameter) combinations per equipment type
- Pipeline gets 10 deviations, not 30 -- no "REVERSE Composition" or "NO Composition" for a pipe
- **Knowledge-base enrichment**: specific causes ("Line blockage from hydrate formation"), not generic ("Equipment malfunction affecting flow")
- **Blocklist post-filter**: any row with 3+ template phrases is filtered out
- Result: ~50 actionable deviations for a 5-node system, ~140 for a 16-node system

### Risk Assessment
- Severity (1-5) and Likelihood (A-E) based on equipment type and deviation category
- High-risk equipment (reactor, column, separator) gets severity boost
- Risk matrix: Critical (>=15), High (>=10), Medium (>=5), Low (<5)
- Color-coded in both frontend worksheet and exported reports

### Professional Reports
- **Excel Worksheet**: Cover sheet, node-by-node deviation tables, risk summary with color coding
- **PDF Compliance Report**: Executive summary, IEC 61882 methodology section, risk matrix visualization, findings ranked by risk, action items table
- Safe handling of special characters, truncated responses, and array fields

### HAZOP Chat Assistant
- Study-aware: answers from your actual analysis data (nodes, deviations, risk scores)
- Study selector dropdown -- choose which study to query
- Auto-selects most recent study when none specified
- Markdown-rendered responses with proper formatting

---

## Demo

| Feature | Description |
|---------|-------------|
| **P&ID Upload** | Upload a 3-phase separator P&ID -- Gemini identifies 5 nodes with instrument tags |
| **Analysis Progress** | Real-time SSE streaming shows Node ID, Deviations, Risk Assessment steps |
| **Worksheet** | 51 specific deviations with risk filters (Critical/High/Medium) |
| **Excel Export** | Professional HAZOP worksheet with risk-colored cells |
| **PDF Report** | Compliance-ready report with executive summary and risk matrix |
| **AI Chat** | Ask "What are the top critical risks?" -- answers with actual severity scores |

---

## Architecture

```
User Browser --- React SPA (Vite :3000)
                    |
                    +-- SSE  --- FastAPI (:8000) --- Gemini 2.5 Flash (Vision)
                    +-- REST --- HAZOP Agent       --- Knowledge Base Engine
                    +-- REST --- Report Generator  --- openpyxl / reportlab
```

```
Upload P&ID Image
  -> Gemini 2.5 Flash: extract nodes with equipment types, instruments, streams
  -> Deterministic Pre-Filter: VALID_COMBOS[equipment_type] -> credible (guide_word, parameter) pairs
  -> Knowledge Base: enrich with specific causes, consequences, safeguards
  -> Risk Assessment: severity x likelihood scoring per equipment class
  -> Blocklist Post-Filter: remove generic template filler
  -> Store in FirestoreService (single data store)
  -> SSE stream progress to frontend
  -> Excel/PDF generation from same data store
```

### Data Flow

**1. P&ID Analysis**
```
User uploads P&ID diagram
  -> Backend saves to uploads/ directory
  -> Creates study record in FirestoreService
  -> Gemini 2.5 Flash: analyzes image with structured JSON output
  -> Nodes identified: equipment_type, name, operating_conditions, instruments
  -> SSE stream: node_identified events pushed to browser in real-time
```

**2. Deviation Generation**
```
For each identified node:
  -> VALID_COMBOS[equipment_type] -> only credible guide_word x parameter pairs
  -> Knowledge base lookup: hazop_equipment.json for specific causes/consequences
  -> Risk assessment: severity/likelihood based on deviation type + equipment class
  -> Blocklist filter: remove rows with generic template content
  -> Store in FirestoreService with study_id linkage
```

**3. Report Generation**
```
User clicks Export Excel or Download PDF
  -> Backend queries FirestoreService for study + nodes + deviations
  -> openpyxl: generates multi-sheet Excel with cover, node worksheets, risk summary
  -> reportlab: generates PDF with executive summary, risk matrix, findings, action items
  -> StreamingResponse returns file to browser for download
```

**4. AI Chat**
```
User sends question in chat panel
  -> Backend loads study data from FirestoreService
  -> Builds context: nodes, risk distribution, top critical deviations
  -> Injects context into Gemini prompt: "Answer ONLY from this data"
  -> Gemini responds with specific nodes, severity scores, recommendations
  -> Markdown-rendered response in chat bubble
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite + Tailwind CSS | SPA with real-time SSE streaming |
| UI Components | Custom components (Card, Badge, Table, Select) | HAZOP-specific UI |
| Backend | Python 3.12 + FastAPI + uvicorn | REST API + SSE streaming |
| AI -- Vision | Gemini 2.5 Flash (`google-genai` SDK) | P&ID diagram analysis |
| AI -- Chat | Gemini 2.5 Flash (same SDK) | Study-aware Q&A assistant |
| Deviation Engine | Pure Python + JSON knowledge base | Deterministic pre-filter + risk scoring |
| Reports -- Excel | openpyxl | Multi-sheet risk-colored worksheets |
| Reports -- PDF | reportlab | Compliance-ready PDF with risk matrix |
| Data Store | In-memory FirestoreService | Single authoritative data store |

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.12+
- Node.js 20+
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/hazop-assistant.git
cd hazop-assistant

# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env and fill in:
#   GOOGLE_API_KEY=your-gemini-api-key
#   GOOGLE_CLOUD_PROJECT=your-project-id
```

### 2. Run both servers

```bash
npm install          # installs concurrently
npm run dev          # starts backend + frontend together
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Health check: http://localhost:8000/health

### 3. Run manually (separate terminals)

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Gemini API key from [Google AI Studio](https://aistudio.google.com) |
| `GOOGLE_CLOUD_PROJECT` | No | GCP project ID (for future Firestore integration) |
| `GOOGLE_CLOUD_LOCATION` | No | Default: `us-central1` |
| `GEMINI_MODEL` | No | Default: `gemini-2.5-flash` |
| `CORS_ORIGINS` | No | Default: `["http://localhost:5173", "http://localhost:3000"]` |
| `SECRET_KEY` | No | Session signing key |

---

## Project Structure

```
hazop-assistant/
+-- backend/
|   +-- agent/
|   |   +-- hazop_agent.py       # HAZOP Agent -- direct Gemini API calls
|   |   +-- prompts.py           # Vision & text prompt templates
|   |   +-- tools.py             # VALID_COMBOS pre-filter, risk assessment, blocklist
|   +-- api/
|   |   +-- deviations.py        # SSE streaming analysis endpoint
|   |   +-- study.py             # Study CRUD
|   |   +-- upload.py            # P&ID file upload
|   |   +-- agent_routes.py      # AI chat with study data injection
|   |   +-- reports.py           # Excel/PDF export endpoints
|   +-- services/
|   |   +-- firestore_service.py # Single authoritative data store
|   |   +-- gemini_vision.py     # Gemini 2.5 Flash client (sync + thread pool)
|   |   +-- report_generator.py  # Excel (openpyxl) + PDF (reportlab) generation
|   +-- knowledge_base/
|   |   +-- hazop_equipment.json # Equipment-specific deviation details
|   |   +-- safeguards.json      # Standard safeguards per equipment/deviation
|   |   +-- incidents.json       # Historical incident database
|   +-- config.py                # Pydantic settings with absolute .env path
|   +-- main.py                  # FastAPI application entry point
|   +-- requirements.txt
|
+-- frontend/
|   +-- src/
|   |   +-- pages/               # AnalyzePage, WorksheetPage, ReportsPage, DashboardPage
|   |   +-- components/          # NodeList, WorksheetTable, ChatAgent, Upload, ReportDownload
|   |   +-- hooks/               # useStudySession
|   |   +-- lib/                 # api.js, utils.js
|   +-- package.json
|   +-- vite.config.js
|
+-- package.json                 # Root: npm run dev starts both servers
+-- README.md
```

---

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/upload` | Upload P&ID diagram, creates study |
| POST | `/api/studies` | Create study manually |
| GET | `/api/studies` | List all studies |
| GET | `/api/studies/{id}` | Get study details |
| PUT | `/api/studies/{id}` | Update study |
| DELETE | `/api/studies/{id}` | Delete study |
| POST | `/api/studies/{id}/analyze` | SSE: full HAZOP analysis stream |
| GET | `/api/studies/{id}/nodes` | List nodes for a study |
| GET | `/api/studies/{id}/nodes/{node_id}/deviations` | List deviations |
| PATCH | `/api/deviations/{id}` | Update a deviation |
| POST | `/api/studies/{id}/export/excel` | Download Excel worksheet |
| POST | `/api/studies/{id}/export/pdf` | Download PDF report |
| POST | `/api/agent/chat` | AI chat with study data |

---

## Key Design Decisions

1. **Deterministic pre-filter over pure AI generation** -- Asking Gemini to generate all deviations produces a cartesian explosion of 200+ template rows. The `VALID_COMBOS` lookup table restricts to physically credible combinations, cutting output by 60-70%.

2. **`response_mime_type: "application/json"`** -- Forces Gemini to return structured JSON instead of markdown-wrapped text. Eliminates parse failures on complex P&ID responses.

3. **`max_output_tokens: 32768`** -- Complex P&IDs with 16+ nodes produce large JSON responses. The default 8192 was truncating the response mid-object, causing silent parse failures.

4. **Sync Gemini + `asyncio.to_thread`** -- The `google-genai` SDK's async client has event loop issues inside uvicorn on Windows. Using sync calls in a thread pool is more reliable than native async.

5. **Single FirestoreService singleton** -- All API routes, the agent, and the report generator read/write through one data store. Eliminates the fragmentation bug where analysis data lived in one dict and reports queried a different empty dict.

6. **Blocklist post-filter** -- Any deviation row where 3+ fields contain template phrases ("equipment malfunction affecting X", "operator training and procedures") is filtered out. Engineers ignore 200 generic rows but read 50 specific ones.

---

## Findings & Learnings

1. **P&ID complexity varies enormously** -- A simple 3-phase separator produces 5 nodes and 51 deviations. A distillation system produces 16 nodes and 140+ deviations. The pre-filter handles both correctly because it's equipment-type-aware.

2. **Gemini Vision is remarkably good at P&IDs** -- It correctly identifies instrument tags (TIC-101, PSV-102), control loops (PC-PV pairs), and equipment relationships from hand-drawn and CAD diagrams alike.

3. **Token limits are the silent killer** -- The biggest bug was `max_output_tokens: 8192` silently truncating JSON responses. The last node would be cut off mid-object, and `json.loads()` would fail. Increasing to 32768 and adding truncated-JSON recovery solved this.

4. **uvicorn --reload breaks .env on Windows** -- The reload subprocess changes the working directory, making relative `.env` paths fail. Fix: use `Path(__file__).parent / ".env"` for an absolute path.

5. **SSE via sse-starlette was unreliable** -- The `EventSourceResponse` from `sse-starlette` silently swallowed generator exceptions and never iterated the async generator in some cases. Replacing with a raw `StreamingResponse` + manual SSE formatting was more reliable.

---

## License

MIT -- see [LICENSE](LICENSE)
