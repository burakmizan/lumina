\# ⚡ Lumina: AI-Powered Financial Reconciliation Agent



\[!\[License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

\[!\[Google Cloud Rapid Agent Hackathon](https://img.shields.io/badge/Hackathon-Google\_Cloud\_Rapid\_Agent-blue)](https://rapid-agent.devpost.com/)

\[!\[Track: MongoDB](https://img.shields.io/badge/Track-MongoDB-success)](#)



> \*\*Built for the Google Cloud Rapid Agent Hackathon 2026\*\*

> Transforming B2B financial discrepancy resolution from a manual, days-long headache into an autonomous, seconds-long process.



\---



\## 🎯 The Mission

In the B2B sector, reconciling ledger accounts between two companies is a highly manual, error-prone, and time-consuming process. Missing invoices, wrong amounts, and communication delays disrupt cash flows. 



\*\*Lumina\*\* is an autonomous AI agent that leverages \*\*Gemini 3\*\* and \*\*MongoDB MCP (Model Context Protocol)\*\* to read on-premise ERP data, instantly identify financial discrepancies between corporate ledgers, and autonomously draft professional resolution workflows.



\## 🧠 How It Works (Multi-Step Architecture)



1\. \*\*Data Ingestion (Local to Cloud):\*\* A lightweight local worker listens to on-premise ERP/Accounting software and securely syncs ledger entries to the \*\*MongoDB\*\* cloud collections.

2\. \*\*MCP-Powered Analysis:\*\* Using the MongoDB MCP server, the Gemini-powered agent directly queries the database to compare Company A's receivables against Company B's payables.

3\. \*\*Autonomous Reasoning:\*\* The agent doesn't just flag errors; it reasons \*why\* they occurred (e.g., "Invoice #145 is missing on Company B's side").

4\. \*\*Human-in-the-Loop Action:\*\* Lumina drafts a highly professional, detailed reconciliation email and pushes it to our React dashboard for managerial approval before sending.



\## 🛠️ Tech Stack

\* \*\*AI Brain:\*\* Google Cloud Agent Builder \& Gemini 3

\* \*\*Data Context \& Integration:\*\* MongoDB Atlas + MongoDB MCP Server

\* \*\*Backend:\*\* Python (FastAPI)

\* \*\*Frontend:\*\* React / Next.js

\* \*\*Deployment:\*\* Google Cloud Run



\## 🚀 Quick Start

\*(Instructions on how to clone, install dependencies, set up `.env` for Gemini/MongoDB, and run the local server will be added here.)\*



\## 🎥 Demo Video

\[Link to the 3-minute Devpost / YouTube Demo Video will be placed here]

