<div align="center">
  <img src="frontend/public/luminawhite.png" alt="Lumina Logo" width="120" />

  # ⚡ Lumina: Enterprise AI Reconciliation Agent

  **Transforming B2B financial discrepancy resolution from a manual, days-long headache into an autonomous, seconds-long process.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Hackathon](https://img.shields.io/badge/Hackathon-Google_Cloud_Rapid_Agent-blue)](https://rapid-agent.devpost.com/)
  [![Track: MongoDB](https://img.shields.io/badge/Track-MongoDB-success)](#)
  [![Built with ADK](https://img.shields.io/badge/Built%20with-Google%20ADK%202.0-4285F4?logo=google)](https://google.github.io/adk-docs/)
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

## 🤖 The Solution: ADK Multi-Agent Architecture

Lumina uses **Google Agent Development Kit (ADK) 2.0** to orchestrate a team of specialized AI agents that work together autonomously:

```text
lumina_root_agent  (Orchestrator — Gemini 3 Flash)
├── reconciliation_sub_agent   → Fetches & compares ledger pairs from MongoDB
├── analysis_sub_agent         → Root-cause analysis of discrepancies
└── communication_sub_agent    → Drafts professional resolution emails