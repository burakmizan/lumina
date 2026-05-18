from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional

from api.dependencies import get_db
from models.discrepancy import DiscrepancyResponse, DiscrepancyUpdate
from services.discrepancy_service import DiscrepancyService

router = APIRouter()


@router.get("/", response_model=List[DiscrepancyResponse])
async def list_discrepancies(
    disc_status: Optional[str] = None,
    company_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await DiscrepancyService(db).get_all(status=disc_status, company_id=company_id)


@router.get("/{discrepancy_id}", response_model=DiscrepancyResponse)
async def get_discrepancy(discrepancy_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    disc = await DiscrepancyService(db).get_by_id(discrepancy_id)
    if not disc:
        raise HTTPException(status_code=404, detail="Discrepancy not found")
    return disc


@router.patch("/{discrepancy_id}", response_model=DiscrepancyResponse)
async def update_discrepancy(
    discrepancy_id: str,
    payload: DiscrepancyUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    disc = await DiscrepancyService(db).update(discrepancy_id, payload)
    if not disc:
        raise HTTPException(status_code=404, detail="Discrepancy not found")
    return disc


@router.post("/{discrepancy_id}/approve", response_model=DiscrepancyResponse)
async def approve_and_send_email(discrepancy_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Human-in-the-Loop approval: confirms the AI-drafted email and triggers SMTP sending."""
    from services.email_service import EmailService
    disc = await DiscrepancyService(db).approve_and_send(discrepancy_id, EmailService())
    if not disc:
        raise HTTPException(status_code=404, detail="Discrepancy not found")
    return disc
