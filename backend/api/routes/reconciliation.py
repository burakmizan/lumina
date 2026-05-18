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
    from agent.reconciliation_engine import ReconciliationEngine
    engine = ReconciliationEngine(db)
    background_tasks.add_task(engine.run, company_a_id, company_b_id)
    return {
        "status": "started",
        "message": f"Reconciliation agent triggered for companies {company_a_id} ↔ {company_b_id}",
    }


@router.get("/status/{run_id}")
async def get_run_status(run_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Check the status of a specific agent reconciliation run."""
    # TODO: Implement agent_runs collection tracking in Phase 2
    return {"run_id": run_id, "status": "pending_implementation"}
