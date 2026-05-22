from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Query
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
    Trigger the reconciliation agent asynchronously — returns run_id immediately
    so the frontend AgentIsland can display live progress while the agent runs.
    """
    import uuid
    from agent.reconciliation_engine import ReconciliationEngine

    run_id = str(uuid.uuid4())

    async def _run_in_background():
        engine = ReconciliationEngine(db)
        await engine.run(company_a_id, company_b_id, run_id)

    background_tasks.add_task(_run_in_background)

    return {
        "status":  "started",
        "run_id":  run_id,
        "message": f"Reconciliation agent started for {company_a_id} ↔ {company_b_id}",
    }

@router.get("/runs")
async def list_agent_runs(
    limit: int = Query(50, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return all agent runs ordered by most recent, including steps."""
    runs = []
    async for doc in db["agent_runs"].find().sort("started_at", -1).limit(limit):
        doc["id"] = str(doc.pop("_id"))
        runs.append(doc)
    return runs

@router.get("/status/{run_id}")
async def get_run_status(run_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db["agent_runs"].find_one({"_id": run_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "run_id":              run_id,
        "status":              doc.get("status", "unknown"),
        "discrepancies_found": doc.get("discrepancies_found", 0),
        "started_at":          doc.get("started_at"),
        "completed_at":        doc.get("completed_at"),
        "error":               doc.get("error"),
        "steps":               doc.get("steps", []),
    }
