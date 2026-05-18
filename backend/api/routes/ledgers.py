from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional

from api.dependencies import get_db
from models.ledger import LedgerCreate, LedgerUpdate, LedgerResponse
from services.ledger_service import LedgerService

router = APIRouter()


@router.get("/", response_model=List[LedgerResponse])
async def list_ledgers(
    company_id: Optional[str] = None,
    ledger_status: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await LedgerService(db).get_all(company_id=company_id, status=ledger_status)


@router.post("/", response_model=LedgerResponse, status_code=status.HTTP_201_CREATED)
async def create_ledger(payload: LedgerCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await LedgerService(db).create(payload)


@router.post("/sync", response_model=List[LedgerResponse], status_code=status.HTTP_201_CREATED)
async def sync_ledgers(payload: List[LedgerCreate], db: AsyncIOMotorDatabase = Depends(get_db)):
    """Bulk upsert endpoint consumed by the Local ERP Agent to push records from client sites."""
    return await LedgerService(db).bulk_upsert(payload)


@router.get("/{ledger_id}", response_model=LedgerResponse)
async def get_ledger(ledger_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    ledger = await LedgerService(db).get_by_id(ledger_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
    return ledger


@router.patch("/{ledger_id}", response_model=LedgerResponse)
async def update_ledger(ledger_id: str, payload: LedgerUpdate, db: AsyncIOMotorDatabase = Depends(get_db)):
    ledger = await LedgerService(db).update(ledger_id, payload)
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
    return ledger
