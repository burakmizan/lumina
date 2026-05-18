from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from api.dependencies import get_db
from models.company import CompanyCreate, CompanyUpdate, CompanyResponse
from services.company_service import CompanyService

router = APIRouter()


@router.get("/", response_model=List[CompanyResponse])
async def list_companies(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await CompanyService(db).get_all()


@router.post("/", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(payload: CompanyCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await CompanyService(db).create(payload)


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    company = await CompanyService(db).get_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: str, payload: CompanyUpdate, db: AsyncIOMotorDatabase = Depends(get_db)):
    company = await CompanyService(db).update(company_id, payload)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(company_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    deleted = await CompanyService(db).delete(company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Company not found")
