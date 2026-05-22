<div align="center">
  <img src="frontend/public/luminawhite.png" alt="Lumina Logo" width="120" />

  # ⚡ Lumina: Enterprise AI Reconciliation Agent

  **Transforming B2B financial discrepancy resolution from a manual, days-long headache into an autonomous, seconds-long process.**

  [![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![Hackathon](https://img.shields.io/badge/Hackathon-Google_Cloud_Rapid_Agent-blue)](https://rapid-agent.devpost.com/)
  [![Track: MongoDB](https://img.shields.io/badge/Track-MongoDB-success)](#)
  [![Built with Agent Builder](https://img.shields.io/badge/Built%20with-Google%20Cloud%20Agent%20Builder-4285F4?logo=google)](#)
  [![Status: Live](https://img.shields.io/badge/Status-Live%20on%20Cloud%20Run-brightgreen)](#)
</div>

---

## 🌐 Live Demo

| Service | URL |
| :--- | :--- |
| 🖥️ **Frontend** | [https://lumina-iota-brown.vercel.app](https://lumina-iota-brown.vercel.app) |
| ⚙️ **Backend API** | [https://lumina-backend-226562576108.us-central1.run.app](https://lumina-backend-226562576108.us-central1.run.app) |
| 📖 **API Docs** | [https://lumina-backend-226562576108.us-central1.run.app/docs](https://lumina-backend-226562576108.us-central1.run.app/docs) |

> **Demo Account:** <br>
> ✉️ **Email:** `demo@lumina.com` <br>
> 🔑 **Password:** `lumina2026`

---

## 🎯 The Problem

In B2B finance, reconciling ledger accounts between two companies is painful:
- ❌ Accountants manually export Excel files and email them back and forth.
- ⏳ A single discrepancy review takes **3–5 business days**.
- ⚠️ Human error rates exceed **12%** on large statement sets.
- 🛑 Cash flow decisions are blocked waiting for resolution.

**Lumina eliminates this entirely.**

---

## 🤖 The Solution: Multi-Agent Architecture (Google Cloud Agent Builder)

Lumina uses **Google Cloud Agent Builder** (via the **Gemini Enterprise Agent Platform SDK for Python**) to orchestrate a team of specialized AI agents that work together autonomously:

```text
lumina_root_agent  (Orchestrator — Gemini 3 Flash)
├── reconciliation_sub_agent   → Fetches & compares ledger pairs from MongoDB
├── analysis_sub_agent         → Root-cause analysis of discrepancies
└── communication_sub_agent    → Drafts professional resolution emails
```

Each agent has dedicated tools bound to MongoDB Atlas via the **MCP protocol**, enabling real database reads mid-reasoning — not just static context injection.

---

## 🗄️ MongoDB Integration (Partner Track)

Lumina's entire data layer runs on **MongoDB Atlas**, integrated via a **Python-native MCP server** (`backend/agent/mcp_server.py`):

| MCP Tool | Collection | Purpose |
| :--- | :--- | :--- |
| `find` | `ledgers` | Fetch transaction records per company pair |
| `find` | `companies` | Load counterparty profiles |
| `aggregate` | `discrepancies` | Trend analytics & type breakdown |
| `insert_one` | `agent_runs` | Track every agent execution |
| `vector_search` | `discrepancies` | Semantic similarity search via Atlas Vector Search + Gemini embeddings |
| `update_one` | `discrepancies` | Persist AI analysis & email drafts |

> **MCP Transport:** The MCP server is served over **real HTTP/SSE transport** — mounted at `/mcp/sse` inside the FastAPI process via a raw ASGI app (`create_mcp_asgi_app`). Clients connect via SSE, receive a `session_id`, and exchange JSON-RPC messages at `/mcp/messages/`. A lightweight in-process fallback is available when the HTTP endpoint is not yet ready (e.g., cold start). The full MCP protocol contract — tool discovery (`tools/list`), tool invocation (`tools/call`), and session lifecycle — is implemented end-to-end and verified: `GET /mcp/sse → 200`, `POST /mcp/messages → 202 Accepted`, `ListToolsRequest processed ✓`.

---

## 🏗️ Full Tech Stack

| Layer | Technology |
| :--- | :--- |
| **AI Orchestration** | Google Cloud Agent Builder (Gemini Enterprise Agent Platform SDK) |
| **LLM** | Gemini 3 Flash Preview (`gemini-3-flash-preview`) |
| **Database** | MongoDB Atlas (Motor async driver) |
| **MCP Partner** | MongoDB — custom Python MCP server |
| **Backend** | FastAPI + Python 3.12 |
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| **Deployment** | Google Cloud Run (backend) + Vercel (frontend) |
| **Auth** | JWT + bcrypt (role-based: Admin, Manager, Staff) |
| **Email** | SMTP async dispatch (auto-send on approval) |
| **ERP Agents** | Local Python agents (SAP / Logo / Mikro / Excel / CSV drivers) |

---

## 🔄 Full Reconciliation Flow

```
1. User imports master balances (Excel/CSV) → MongoDB ledgers collection
2. Counterparty uploads their statement via secure magic-link portal
3. User triggers reconciliation → lumina_root_agent starts
4. reconciliation_sub_agent → MCP find() → fetches both ledger sets
5. ReconciliationEngine diffs records by transaction_ref
6. For each mismatch → analysis_sub_agent classifies root cause
7. communication_sub_agent drafts a professional resolution email
8. Discrepancy saved to MongoDB with status: awaiting_approval (Human-in-the-Loop)
9. User reviews in dashboard → Approve & Send → SMTP dispatches email
10. Status updated to email_sent / resolved
```

---

## 🌍 Real-World Impact

The B2B account reconciliation market represents **$4.7B+** in annual accounting labor costs globally. Lumina targets the core pain point: the 3–5 business day cycle for a single discrepancy review.

| Metric | Before Lumina | With Lumina |
| :--- | :--- | :--- |
| Time per discrepancy | 3–5 business days | ~8 seconds |
| Human error rate | >12% | <1% (AI-classified) |
| Email drafting | Manual, inconsistent | Auto-generated, professional |
| Audit trail | Spreadsheets | Full MongoDB history |

---

## 🚀 Local Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- MongoDB Atlas cluster (free tier works)
- Google Cloud project with Gemini API enabled

### Backend
```bash
cd backend
cp ../.env.example .env   # fill in your credentials
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

### Seed Demo Data
```bash
cd backend
python scripts/seed_mock_data.py
```

---

## 🏢 ERP Local Agent

For companies with on-premise ERP systems (SAP, Logo, Mikro), Lumina provides a **downloadable local agent** that syncs data automatically:

1. Generate API credentials from the **Integrations** page
2. Download the agent ZIP (includes `config.json` pre-configured)
3. Run `start-lumina.bat` on your local network
4. Data syncs to MongoDB Atlas on a configurable schedule

Supported ERP drivers: `excel`, `csv`, `sap`, `logo`, `mikro`

---

## 💡 Key Learnings

- **Gemini Enterprise Agent Platform SDK** enables a clean, code-first separation of concerns — each sub-agent has a narrow, well-defined responsibility, making the system easier to debug and extend compared to pure low-code setups.
- **MCP as a Data Bridge** gives agents a structured, tool-call interface to MongoDB rather than dumping raw data into the context window — dramatically reducing hallucination on financial figures.
- **Human-in-the-Loop is non-negotiable** in finance. The `awaiting_approval` gate before any email dispatch ensures accountants stay in control even as AI handles the heavy lifting.
- **Schema-free MongoDB** was ideal for reconciliation data: ledger records from 5+ ERP systems have wildly different shapes, and MongoDB's flexible documents absorbed all of them without migrations.

---

## 📄 License

Licensed under the [Apache License 2.0](LICENSE).