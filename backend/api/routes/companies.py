from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List
import io

from api.dependencies import get_db
from models.company import CompanyCreate, CompanyUpdate, CompanyResponse, BulkImportResult
from services.company_service import CompanyService
from services.template_service import generate_template

router = APIRouter()


class BulkDeleteRequest(BaseModel):
    ids: List[str]


class BulkDeleteResponse(BaseModel):
    deleted: int
    message: str


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/template")
async def download_counterparties_template():
    """Return a pre-formatted Excel template for the counterparties bulk import."""
    data, filename = await generate_template("counterparties")
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Bulk import ───────────────────────────────────────────────────────────────

@router.post("/import", response_model=BulkImportResult, status_code=status.HTTP_200_OK)
async def bulk_import_counterparties(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Accepts an Excel (.xlsx/.xls) or CSV file with dynamic column detection.
    Columns: Company Name, Tax ID / VAT Number, Customer Code, Contact Name,
             Status, Phone1, Phone2, …, Mail1, Mail2, …
    Arrays are stored directly on the MongoDB document.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
    ext = file.filename.lower().rsplit(".", 1)[-1]
    if ext not in ("xlsx", "xls", "csv"):
        raise HTTPException(status_code=400, detail="Only .xlsx, .xls, or .csv files are accepted.")

    contents = await file.read()
    result = await CompanyService(db).bulk_import_from_excel(contents, file.filename)
    return result


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[CompanyResponse])
async def list_companies(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await CompanyService(db).get_all()


@router.post("/", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(payload: CompanyCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await CompanyService(db).create(payload)


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_companies(
    payload: BulkDeleteRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="No IDs provided.")
    count = await CompanyService(db).bulk_cascade_delete(payload.ids)
    return BulkDeleteResponse(
        deleted=count,
        message=f"{count} counterpart{'y' if count == 1 else 'ies'} and all associated data permanently deleted.",
    )


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    company = await CompanyService(db).get_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    payload: CompanyUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    company = await CompanyService(db).update(company_id, payload)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(company_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    deleted = await CompanyService(db).cascade_delete(company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Company not found")
