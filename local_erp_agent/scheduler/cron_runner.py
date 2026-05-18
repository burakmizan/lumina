"""
Cron Runner — async polling loop for the Local ERP Agent.
Reads config from .env and runs a sync_once() cycle at the configured interval.
Uses asyncio.sleep (not threads) — safe on Windows with the default ProactorEventLoop.
"""
import asyncio
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ERP_SYNC_API_URL = os.getenv("ERP_SYNC_API_URL", "http://localhost:8000")
ERP_SYNC_API_KEY = os.getenv("ERP_SYNC_API_KEY", "")
ERP_POLL_INTERVAL_SECONDS = int(os.getenv("ERP_POLL_INTERVAL_SECONDS", "3600"))
ERP_SOURCE_TYPE = os.getenv("ERP_SOURCE_TYPE", "excel")
ERP_DATA_PATH = os.getenv("ERP_DATA_PATH", "./data/erp_export.xlsx")
COMPANY_ID = os.getenv("COMPANY_ID", "")
COUNTERPARTY_ID = os.getenv("COUNTERPARTY_ID", "")


async def sync_once():
    """Execute one full ERP read → normalize → cloud push cycle."""
    from fetcher.erp_reader import ERPReader
    from fetcher.data_normalizer import DataNormalizer
    from sync.cloud_sync import CloudSync

    logger.info(f"Sync cycle starting | source={ERP_SOURCE_TYPE} | path={ERP_DATA_PATH}")

    raw_records = ERPReader(source_type=ERP_SOURCE_TYPE, data_path=ERP_DATA_PATH).read()
    logger.info(f"Read {len(raw_records)} raw records from ERP.")

    normalized = DataNormalizer(
        company_id=COMPANY_ID,
        counterparty_id=COUNTERPARTY_ID,
        source=ERP_SOURCE_TYPE,
    ).normalize(raw_records)
    logger.info(f"Normalized {len(normalized)} records.")

    await CloudSync(api_url=ERP_SYNC_API_URL, api_key=ERP_SYNC_API_KEY).push_ledgers(normalized)


async def start_scheduler():
    """Run sync_once on a loop at ERP_POLL_INTERVAL_SECONDS cadence."""
    logger.info(f"Local ERP Agent started — sync every {ERP_POLL_INTERVAL_SECONDS}s.")
    while True:
        try:
            await sync_once()
        except Exception as e:
            logger.error(f"Sync cycle failed: {e}", exc_info=True)
        logger.info(f"Next sync in {ERP_POLL_INTERVAL_SECONDS}s.")
        await asyncio.sleep(ERP_POLL_INTERVAL_SECONDS)
