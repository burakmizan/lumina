import logging
import os
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.dependencies import get_db
from core.config import settings
from models.reconciliation_session import (
    ReconciliationSessionCreate,
    ReconciliationSessionResponse,
    TokenValidationResponse,
    PortalUploadResponse,
)
from services.reconciliation_session_service import ReconciliationSessionService
from services.magic_link_email_service import MagicLinkEmailService
from services.company_service import CompanyService
from services.file_storage_service import FileStorageService

logger = logging.getLogger(__name__)

router = APIRouter()

_ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv", ".pdf"}


@router.post("/sessions/start", response_model=ReconciliationSessionResponse)
async def start_reconciliation_session(
    payload: ReconciliationSessionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    company_svc = CompanyService(db)

    initiating = await company_svc.get_by_id(payload.initiating_company_id)
    if not initiating:
        raise HTTPException(status_code=404, detail="Initiating company not found")

    counterparty = await company_svc.get_by_id(payload.counterparty_id)
    if not counterparty:
        raise HTTPException(status_code=404, detail="Counterparty company not found")

    session_svc = ReconciliationSessionService(db)
    session = await session_svc.create(payload.initiating_company_id, payload.counterparty_id)

    email_svc = MagicLinkEmailService()
    await email_svc.send_magic_link(
        counterparty_name=counterparty["name"],
        initiating_company_name=initiating["name"],
        recipient_email=counterparty["reconciliation_email"],
        token=session["token"],
        frontend_base_url=settings.FRONTEND_BASE_URL,
    )

    return session


@router.get("/sessions/validate/{token}", response_model=TokenValidationResponse)
async def validate_portal_token(token: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    session_svc = ReconciliationSessionService(db)
    session = await session_svc.validate_token(token)

    if not session:
        return TokenValidationResponse(
            valid=False, message="Token is invalid or has expired."
        )

    init_name, cp_name = await session_svc.get_company_names(
        session["initiating_company_id"], session["counterparty_id"]
    )

    return TokenValidationResponse(
        valid=True,
        session_id=session["id"],
        initiating_company_name=init_name,
        counterparty_name=cp_name,
        expires_at=session["expires_at"],
    )


@router.get("/sessions/counterparty/{counterparty_id}", response_model=List[ReconciliationSessionResponse])
async def list_sessions_by_counterparty(
    counterparty_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    session_svc = ReconciliationSessionService(db)
    return await session_svc.get_by_counterparty(counterparty_id)


@router.get("/sessions/{session_id}/download")
async def download_session_file(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Download the raw file that was uploaded during a portal session."""
    from bson import ObjectId
    collection = db["reconciliation_sessions"]
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=404, detail="Session not found.")
    session = await collection.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    storage_id = session.get("storage_id")
    if not storage_id:
        raise HTTPException(status_code=404, detail="No file stored for this session.")

    file_svc = FileStorageService(db, settings.UPLOAD_DIR)
    result = await file_svc.get_file(storage_id)
    if not result:
        raise HTTPException(status_code=404, detail="File not found on server.")

    filename, file_bytes = result
    ext = os.path.splitext(filename)[1].lower()
    content_type_map = {
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls":  "application/vnd.ms-excel",
        ".csv":  "text/csv",
        ".pdf":  "application/pdf",
    }
    content_type = content_type_map.get(ext, "application/octet-stream")

    return StreamingResponse(
        iter([file_bytes]),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/sessions/{session_id}/file", status_code=200)
async def delete_session_file(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Permanently delete the stored file for a session.
    Clears the storage_id and filename from the session document.
    The session itself and its parsed ledger entries are preserved.
    """
    from bson import ObjectId
    collection = db["reconciliation_sessions"]
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=404, detail="Session not found.")
    session = await collection.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    storage_id = session.get("storage_id")
    if not storage_id:
        raise HTTPException(status_code=404, detail="No file stored for this session.")

    file_svc = FileStorageService(db, settings.UPLOAD_DIR)
    await file_svc.delete_file(storage_id)

    session_svc = ReconciliationSessionService(db)
    await session_svc.clear_file_reference(session_id)

    return {"message": "File deleted successfully."}


@router.post("/upload", response_model=PortalUploadResponse)
async def upload_counterparty_ledger(
    token: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Receives the counterparty's ledger file (Excel / CSV / PDF).
    1. Validates the session token.
    2. Persists the raw file for later download.
    3. Parses the file using GeminiParser (arbitrary format normalisation).
    4. Upserts normalised records into MongoDB as Company B ledger data.
    5. Marks the session as processing-ready.
    """
    session_svc = ReconciliationSessionService(db)
    session = await session_svc.validate_token(token)
    if not session:
        raise HTTPException(status_code=401, detail="Token is invalid or has expired.")

    filename = file.filename or "upload.xlsx"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Accepted: {', '.join(_ALLOWED_EXTENSIONS)}",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    # Persist raw file immediately (before parsing, so it's recoverable on parse error)
    file_svc  = FileStorageService(db, settings.UPLOAD_DIR)
    storage_id = await file_svc.save_file(
        file_bytes,
        filename,
        source="portal",
        counterparty_id=session["counterparty_id"],
        metadata={"session_id": session["id"]},
    )

    from agent.gemini_parser import GeminiParser
    from services.ledger_service import LedgerService
    from models.ledger import LedgerCreate

    parser = GeminiParser(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)

    try:
        parsed_records = await parser.parse_ledger_file(file_bytes, filename)
    except Exception as e:
        logger.error(f"[Portal/Upload] Parse error: {e}")
        raise HTTPException(status_code=422, detail=f"File parsing error: {str(e)}")

    if not parsed_records:
        raise HTTPException(
            status_code=422,
            detail="No records could be read from the file. Please upload your ledger statement in Excel, CSV, or PDF format.",
        )

    ledger_svc = LedgerService(db)
    created: list[dict] = []
    for rec in parsed_records:
        try:
            raw_date = str(rec.get("transaction_date", ""))
            try:
                tx_date = datetime.fromisoformat(raw_date)
            except ValueError:
                tx_date = datetime.utcnow()

            ledger_payload = LedgerCreate(
                company_id=session["counterparty_id"],
                counterparty_id=session["initiating_company_id"],
                transaction_ref=str(rec.get("transaction_ref", f"ROW-{len(created)+1}")),
                transaction_type=rec.get("transaction_type", "invoice"),
                amount=abs(float(rec.get("amount", 0))),
                currency=str(rec.get("currency", "USD")),
                transaction_date=tx_date,
                description=str(rec.get("description", "")),
                source=f"portal:{session['id']}",
            )
            created.append(await ledger_svc.create(ledger_payload))
        except Exception as e:
            logger.warning(f"[Portal/Upload] Skipping malformed record: {e} — {rec}")

    await session_svc.mark_upload_complete(
        session["id"], len(created), filename=filename, storage_id=storage_id
    )

    logger.info(
        f"[Portal/Upload] Session {session['id']}: {len(created)}/{len(parsed_records)} records saved"
    )

    return PortalUploadResponse(
        session_id=session["id"],
        parsed_count=len(created),
        message=f"{len(created)} records successfully imported.",
    )
