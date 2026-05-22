import uuid
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from agent.adk_engine import analyze_discrepancy_adk
from agent.mcp_client import MCPMongoClient
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
        self.ledger_svc = LedgerService(db)
        self.disc_svc = DiscrepancyService(db)
        self.company_svc = CompanyService(db)

    async def run(self, company_a_id: str, company_b_id: str, run_id: str = None) -> str:
        if not run_id:
            run_id = str(uuid.uuid4())
        logger.info(f"[Run {run_id}] Starting reconciliation: {company_a_id} ↔ {company_b_id}")

        from datetime import datetime
        await self.db["agent_runs"].insert_one({
            "_id":            run_id,
            "company_a_id":   company_a_id,
            "company_b_id":   company_b_id,
            "status":         "running",
            "discrepancies_found": 0,
            "started_at":     datetime.utcnow(),
            "completed_at":   None,
            "error":          None,
        })

        company_a = await self.company_svc.get_by_id(company_a_id)
        company_b = await self.company_svc.get_by_id(company_b_id)
        if not company_a or not company_b:
            logger.error(f"[Run {run_id}] One or both companies not found.")
            await self.db["agent_runs"].update_one(
                {"_id": run_id},
                {"$set": {"status": "failed", "error": "companies_not_found", "completed_at": datetime.utcnow()}},
            )
            return run_id

        import re
        # Bizim kayıtlarımız: internal_statement kaynaklı ve karşı firmaya ait olanlar
        our_filter   = {"counterparty_id": company_b_id, "source": "internal_statement"}
        # Karşı tarafın portal üzerinden yüklediği kayıtlar (bizim firmayı hedefleyen)
        their_filter = {"counterparty_id": company_a_id, "source": re.compile(r"^portal:")}

        try:
            async with MCPMongoClient() as mcp:
                our_side   = await mcp._call_tool("find", {
                    "collection": "ledgers",
                    "filter":     {"counterparty_id": company_b_id, "source": "internal_statement"},
                    "limit":      500,
                })
                their_side = await mcp._call_tool("find", {
                    "collection": "ledgers",
                    "filter":     {"counterparty_id": company_a_id, "source": {"$regex": "^portal:"}},
                    "limit":      500,
                })
            ledgers_a = [d for d in (our_side   if isinstance(our_side,   list) else [])]
            ledgers_b = [d for d in (their_side if isinstance(their_side, list) else [])]
            logger.info(f"[Run {run_id}] MCP fetch: A={len(ledgers_a)}, B={len(ledgers_b)}")
            if not ledgers_a and not ledgers_b:
                raise RuntimeError("MCP 0 kayıt döndürdü, motor fallback")
        except Exception as mcp_err:
            logger.warning(f"[Run {run_id}] MCP unavailable, motor kullanılıyor.")
            ledgers_a, ledgers_b = [], []
            async for doc in self.db["ledgers"].find(our_filter):
                doc["id"] = str(doc.pop("_id", ""))
                ledgers_a.append(doc)
            async for doc in self.db["ledgers"].find(their_filter):
                doc["id"] = str(doc.pop("_id", ""))
                ledgers_b.append(doc)
            logger.info(f"[Run {run_id}] Motor: A={len(ledgers_a)}, B={len(ledgers_b)}")

        map_a: dict = {}
        for l in ledgers_a:
            ref = l.get("transaction_ref")
            if not ref:
                continue
            if ref not in map_a or abs(float(l.get("amount", 0))) > abs(float(map_a[ref].get("amount", 0))):
                map_a[ref] = l

        map_b: dict = {}
        for l in ledgers_b:
            ref = l.get("transaction_ref")
            if not ref:
                continue
            if ref not in map_b or abs(float(l.get("amount", 0))) > abs(float(map_b[ref].get("amount", 0))):
                map_b[ref] = l
        all_refs = set(map_a.keys()) | set(map_b.keys())

        found = 0
        for ref in all_refs:
            rec_a = map_a.get(ref)
            rec_b = map_b.get(ref)
            dtype = self._classify(rec_a, rec_b)
            if not dtype:
                continue

            # AI analysis — hata olursa varsayılan metin kullan, discrepancy yine de kaydedilsin
            try:
                gemini_result = await analyze_discrepancy_adk(
                    company_a, company_b, ref,
                    {"company_a_record": rec_a, "company_b_record": rec_b},
                )
            except Exception as ai_err:
                logger.warning(f"[Run {run_id}] AI analysis failed for {ref}: {ai_err}")
                gemini_result = {
                    "analysis": f"Discrepancy detected for transaction {ref}. Manual review required.",
                    "email_draft": (
                        f"Subject: Account Reconciliation — {ref}\n\n"
                        f"Dear {company_b.get('name', 'Team')},\n\n"
                        f"We have identified a discrepancy for transaction {ref}. "
                        f"Please review at your earliest convenience.\n\n"
                        f"Best regards,\n{company_a.get('name', 'Lumina')}"
                    ),
                }

            try:
                val_a = float(rec_a["amount"] if rec_a else 0.0)
                val_b = float(rec_b["amount"] if rec_b else 0.0)
                
                calculated_diff = abs(abs(val_a) - abs(val_b))

                payload = DiscrepancyCreate(
                    company_a_id=company_a_id,
                    company_b_id=company_b_id,
                    ledger_ref=ref,
                    discrepancy_type=dtype,
                    company_a_amount=val_a,
                    company_b_amount=val_b,
                    difference=calculated_diff,
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
                logger.info(f"[Run {run_id}] Discrepancy saved: {ref} ({dtype})")
            except Exception as db_err:
                logger.error(f"[Run {run_id}] Failed to save discrepancy for {ref}: {db_err}")

        from datetime import datetime
        await self.db["agent_runs"].update_one(
            {"_id": run_id},
            {"$set": {
                "status":              "completed",
                "discrepancies_found": found,
                "completed_at":        datetime.utcnow(),
            }},
        )
        # Generate embeddings for vector search (non-blocking)
        await self._generate_embeddings(run_id)
        logger.info(f"[Run {run_id}] Reconciliation complete — {found} discrepancies detected.")
        return run_id

    async def _generate_embeddings(self, run_id: str):
        try:
            import google.generativeai as genai
            from core.config import settings
            genai.configure(api_key=settings.GEMINI_API_KEY)
            async for doc in self.db["discrepancies"].find(
                {"agent_run_id": run_id, "embedding": {"$exists": False}}
            ):
                text = " ".join(filter(None, [
                    doc.get("ledger_ref", ""),
                    doc.get("discrepancy_type", ""),
                    doc.get("ai_analysis", ""),
                ]))
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_document",
                )
                await self.db["discrepancies"].update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"embedding": result["embedding"]}},
                )
            logger.info(f"[Run {run_id}] Embeddings generated for vector search.")
        except Exception as e:
            logger.warning(f"[Run {run_id}] Embedding generation skipped: {e}")

    def _classify(self, rec_a: dict, rec_b: dict) -> str:

        if not rec_a or not rec_b:
            return "missing_record"
            
        amt_a = float(rec_a.get("amount") or 0.0)
        amt_b = float(rec_b.get("amount") or 0.0)

        if abs(amt_a + amt_b) < 0.02:
            return None
            
        return "amount_mismatch"
