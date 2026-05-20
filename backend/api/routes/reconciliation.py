from fastapi import APIRouter, Depends, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.dependencies import get_db

router = APIRouter()


@router.post("/run")
async def trigger_reconciliation(
    company_a_id: str,
    company_b_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Trigger the Gemini reconciliation agent for a company pair.
    Uses FastAPI BackgroundTasks (thread-pool backed) — safe on Windows,
    avoids asyncio subprocess/selector issues that cause TCP resets.
    """
    import uuid
    from agent.reconciliation_engine import ReconciliationEngine
    run_id = str(uuid.uuid4())
    engine = ReconciliationEngine(db)
    background_tasks.add_task(engine.run, company_a_id, company_b_id, run_id)
    return {
        "status":  "started",
        "run_id":  run_id,
        "message": f"Reconciliation agent triggered for companies {company_a_id} ↔ {company_b_id}",
    }


@router.get("/status/{run_id}")
async def get_run_status(run_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Check the status of a specific agent reconciliation run."""
    doc = await db["agent_runs"].find_one({"_id": run_id})
    if not doc:
        return {"run_id": run_id, "status": "not_found"}
    return {
        "run_id":              doc["_id"],
        "status":              doc.get("status"),
        "discrepancies_found": doc.get("discrepancies_found", 0),
        "started_at":          str(doc.get("started_at", "")),
        "completed_at":        str(doc.get("completed_at", "")) if doc.get("completed_at") else None,
        "error":               doc.get("error"),
    }
