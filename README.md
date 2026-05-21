<div align="center">
  <img src="frontend/public/luminawhite.png" alt="Lumina Logo" width="120" />
  
  # ⚡ Lumina: Enterprise AI Reconciliation Agent
  
  **Transforming B2B financial discrepancy resolution from a manual, days-long headache into an autonomous, seconds-long process.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Hackathon](https://img.shields.io/badge/Hackathon-Google_Cloud_Rapid_Agent-blue)](https://rapid-agent.devpost.com/)
  [![Track: MongoDB](https://img.shields.io/badge/Track-MongoDB-success)](#)
  [![Status: Production Ready](https://img.shields.io/badge/Status-Production_Ready-orange)](#)

</div>

---

## 🎯 The Mission
In the B2B sector, reconciling ledger accounts (Statements of Account) between two companies is a highly manual, error-prone, and time-consuming process. Missing invoices, wrong amounts, and communication delays disrupt cash flows.

**Lumina** is an autonomous AI agent that leverages **Gemini 3** and **MongoDB MCP (Model Context Protocol)** to read on-premise ERP data, instantly identify financial discrepancies between corporate ledgers, and autonomously draft professional resolution workflows.

---

## 🧠 The Architecture (Dual-Pipeline Sync)

Lumina operates on a strict, enterprise-grade data pipeline to ensure mathematical accuracy and zero-touch automation.

1. **Local ERP Agent:** A lightweight, secure Windows worker (`start-lumina.bat`) runs on the client's network. It features a VT100 ANSI interface and automatically pushes ERP data via JSON.
2. **Master Data Sync (Step 1):** The agent first synchronizes Counterparty profiles (Tax IDs, Contacts) to prevent orphaned records.
3. **Ledger Upsert (Step 2):** Transactional data is pushed to the cloud. The backend strictly prevents duplicates using `(Ref_No + Company_ID)` composite keys.
4. **Auto-Triggered AI:** The moment data hits the MongoDB `ledgers` collection, a background FastAPI task awakens the Gemini AI Engine to cross-check records and generate the Discrepancy Feed.

---

## 🛠️ Tech Stack & Infrastructure

| Category | Technology | Role in Lumina |
| :--- | :--- | :--- |
| **AI Brain** | **Gemini Pro** | Root-cause analysis, discrepancy reasoning, and email generation. |
| **Database** | **MongoDB Atlas** | Fast, flexible ledger storage with Model Context Protocol (MCP) support. |
| **Backend** | **Python (FastAPI)** | Async API, Auto-Trigger AI tasks, and Master Balance calculation engine. |
| **Frontend** | **Next.js (React)** | Dashboard, Discrepancy Feed, and interactive Statement view modals. |
| **Edge Agent** | **Python / Batch** | Local ERP synchronization, secure API key rotation, Windows Task Scheduler ready. |

---

## ✨ Core Features

* **Account Statement Auto-Matching:** Automatically groups raw ledgers into net master balances.
* **Smart Discrepancy Feed:** Highlights exactly *why* accounts don't match (Missing Record, Amount Mismatch, Date Mismatch).
* **AI-Drafted Communications:** Gemini drafts formal, context-aware English emails to counterparty accounting teams.
* **Magic Link Portal:** Sends secure, 72-hour valid tokens for counterparties to upload their own internal statements without needing an account.
* **Zero-Trust Security:** Agent packages are dynamically generated with hashed API keys and strict company IDs.

---

## 🚀 Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone [https://github.com/your-org/lumina.git](https://github.com/your-org/lumina.git)

cd lumina

2. Backend Setup
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows
pip install -r requirements.txt
cp .env.example .env          # Add your GEMINI_API_KEY and MONGODB_URI
uvicorn main:app --reload

3. Frontend Setup
cd frontend
npm install
cp .env.local.example .env.local
npm run dev

4. Running the Local ERP Agent
Navigate to the Lumina Dashboard -> Integrations -> Download Agent Package. Extract the ZIP and double-click start-lumina.bat to initiate the secure ANSI-colored sync sequence.

Note: The local agent requires Python 3.10+ and outbound HTTPS access to your FastAPI backend.