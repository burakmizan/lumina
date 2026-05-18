"""
Lumina Local ERP Agent
======================
Runs on the client's local network. Reads ERP data (Excel / SAP / Logo / Mikro)
on a configurable schedule and syncs standardized ledger records to the Lumina
cloud API so the Gemini reconciliation agent always operates on fresh data.

Usage:
    python main.py
"""
import asyncio
import logging
from scheduler.cron_runner import start_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

if __name__ == "__main__":
    asyncio.run(start_scheduler())
