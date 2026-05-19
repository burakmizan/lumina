import uuid
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from agent.gemini_agent import GeminiAgent
from services.ledger_service import LedgerService
from services.discrepancy_service import DiscrepancyService
from services.company_service import CompanyService
from models.discrepancy import DiscrepancyCreate, DiscrepancyUpdate

logger = logging.getLogger(__name__)


class ReconciliationEngine:
    """
    Orchestrates the full reconciliation workflow:
    1. Fetch ledger pairs for two companies from MongoDB
    2. Diff records by transaction_ref to find mismatches
    3. Call GeminiAgent for root-cause analysis and email draft
    4. Persist DiscrepancyInDB with status=awaiting_approval (Human-in-the-Loop)
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.gemini = GeminiAgent()
        self.ledger_svc = LedgerService(db)
        self.disc_svc = DiscrepancyService(db)
        self.company_svc = CompanyService(db)

    async def run(self, company_a_id: str, company_b_id: str) -> str:
        run_id = str(uuid.uuid4())
        logger.info(f"[Run {run_id}] Starting reconciliation: {company_a_id} ↔ {company_b_id}")

        company_a = await self.company_svc.get_by_id(company_a_id)
        company_b = await self.company_svc.get_by_id(company_b_id)
        if not company_a or not company_b:
            logger.error(f"[Run {run_id}] One or both companies not found.")
            return run_id

        # Enterprise Tier-1: Sadece bu iki firma arasındaki cari hesap hareketlerini filtrele
        all_a = await self.ledger_svc.get_all(company_id=company_a_id)
        all_b = await self.ledger_svc.get_all(company_id=company_b_id)
        
        ledgers_a = [l for l in all_a if str(l.get("counterparty_id")) == str(company_b_id)]
        ledgers_b = [l for l in all_b if str(l.get("counterparty_id")) == str(company_a_id)]

        map_a = {l["transaction_ref"]: l for l in ledgers_a}
        map_b = {l["transaction_ref"]: l for l in ledgers_b}
        all_refs = set(map_a.keys()) | set(map_b.keys())

        found = 0
        for ref in all_refs:
            rec_a = map_a.get(ref)
            rec_b = map_b.get(ref)
            dtype = self._classify(rec_a, rec_b)
            if not dtype:
                continue

            gemini_result = await self.gemini.analyze_discrepancy(
                company_a, company_b, ref,
                {"company_a_record": rec_a, "company_b_record": rec_b},
            )

            payload = DiscrepancyCreate(
                company_a_id=company_a_id,
                company_b_id=company_b_id,
                ledger_ref=ref,
                discrepancy_type=dtype,
                company_a_amount=rec_a["amount"] if rec_a else None,
                company_b_amount=rec_b["amount"] if rec_b else None,
                difference=abs(
                    (rec_a["amount"] if rec_a else 0.0) - (rec_b["amount"] if rec_b else 0.0)
                ),
            )
            disc = await self.disc_svc.create(payload, agent_run_id=run_id)
            await self.disc_svc.update(
                disc["id"],
                DiscrepancyUpdate(
                    ai_analysis=gemini_result.get("analysis", ""),
                    email_draft=gemini_result.get("email_draft", ""),
                    status="awaiting_approval",
                ),
            )
            found += 1

        logger.info(f"[Run {run_id}] Reconciliation complete — {found} discrepancies detected.")
        return run_id

    def _classify(self, rec_a: dict, rec_b: dict) -> str:
        if not rec_a:
            return "missing_record"
        if not rec_b:
            return "missing_record"
            
        amt_a = float(rec_a.get("amount") or 0.0)
        amt_b = float(rec_b.get("amount") or 0.0)
        
        if abs(amt_a - amt_b) > 0.01:
            return "amount_mismatch"
            
        # Compare dates as ISO strings to avoid tz issues
        date_a = str(rec_a.get("transaction_date", ""))[:10]
        date_b = str(rec_b.get("transaction_date", ""))[:10]
        if date_a != date_b:
            return "date_mismatch"
            
        return None
