import logging
import os
import io
import openpyxl
from urllib.parse import quote
from datetime import datetime
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.dependencies import get_db, get_current_user
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
_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/sessions/start", response_model=ReconciliationSessionResponse)
async def start_reconciliation_session(
    payload: ReconciliationSessionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_user),
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
    _: dict = Depends(get_current_user),
):
    session_svc = ReconciliationSessionService(db)
    return await session_svc.get_by_counterparty(counterparty_id)


@router.get("/sessions/{session_id}/download")
async def download_session_file(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_user),
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
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


@router.delete("/sessions/{session_id}/file", status_code=200)
async def delete_session_file(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_user),
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


async def _process_portal_upload(
    db: AsyncIOMotorDatabase,
    session_id: str,
    initiating_company_id: str,
    counterparty_id: str,
    file_bytes: bytes,
    filename: str,
    storage_id: str,
) -> None:
    """Parse file + create ledger records + trigger reconciliation — runs in background."""
    from agent.reconciliation_engine import ReconciliationEngine
    from services.ledger_service import LedgerService
    from models.ledger import LedgerCreate
    import uuid

    session_svc = ReconciliationSessionService(db)
    ledger_svc = LedgerService(db)
    created: list[dict] = []

    try:
        # Tier-1 Local Parser: 401 veren Gemini yerine openpyxl ile Excel'i okuyoruz
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        
        logger.info(f"[HACKATHON-TEST] PORTAL PARSED ROWS COUNT: {len(rows)}")
        for idx, row_data in enumerate(rows):
            logger.info(f"[HACKATHON-TEST] ROW {idx}: {row_data}")
        
        if rows:
            headers = [str(c).lower().strip() if c is not None else "" for c in rows[0]]
            
            # Sütun indekslerini esnekçe tespit et
            ref_idx = next((i for i, h in enumerate(headers) if "ref" in h or "invoice" in h or "no" in h), 0)
            amt_idx = next((i for i, h in enumerate(headers) if "outstanding" in h or "amount" in h or "balance" in h or "tutar" in h), 1)
            desc_idx = next((i for i, h in enumerate(headers) if "name" in h or "desc" in h or "açıklama" in h), 2)
            
            # Eski portal kayıtlarını bu seans öncesinde temizle
            await db["ledgers"].delete_many({
                "company_id":       counterparty_id,
                "counterparty_id": initiating_company_id,
                "source":          f"portal:{session_id}",
            })
            logger.info(f"[Portal/BG] Eski portal kayıtları temizlendi: {counterparty_id}")

            for row in rows[1:]:
                if not any(c is not None for c in row):
                    continue
                    
                txn_ref = str(row[ref_idx]).strip() if ref_idx < len(row) and row[ref_idx] else f"PRTL-{len(created)+1}"
                
                try:
                    # Tier-1 Fix: Kutuplaşma (+ / -) dengesini bozmamak için abs() fonksiyonunu KALDIRDIK!
                    raw_amt = str(row[amt_idx]).replace(",", "").replace(" ", "").replace("$", "") if amt_idx < len(row) else "0"
                    amount_val = float(raw_amt)
                except (ValueError, TypeError):
                    amount_val = 0.0
                    
                desc = str(row[desc_idx]).strip() if desc_idx < len(row) and row[desc_idx] else "Portal Entry"

                ledger_payload = LedgerCreate(
                    company_id=counterparty_id,
                    counterparty_id=initiating_company_id,
                    transaction_ref=str(txn_ref),
                    transaction_type="invoice",
                    amount=amount_val,
                    currency="USD",
                    transaction_date=datetime.utcnow(),
                    description=desc,
                    source=f"portal:{session_id}",
                )
                created.append(await ledger_svc.create(ledger_payload))
                
    except Exception as e:
        logger.error(f"[Portal/BG] Yerel Excel parsing motoru hata aldı: {e}")

    await session_svc.mark_upload_complete(
        session_id, len(created), filename=filename, storage_id=storage_id
    )
    logger.info(f"[Portal/BG] {len(created)} records processed for session {session_id}")

    if created:
        run_id = str(uuid.uuid4())
        await ReconciliationEngine(db).run(initiating_company_id, counterparty_id, run_id)
        logger.info(f"[Portal/BG] Reconciliation complete: run_id={run_id}")
@router.post("/upload", response_model=PortalUploadResponse)
async def upload_counterparty_ledger(
    background_tasks: BackgroundTasks,
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
    if len(file_bytes) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    # Persist raw file immediately (before parsing, so it's recoverable on parse error)
    file_svc  = FileStorageService(db, settings.UPLOAD_DIR)
    storage_id = await file_svc.save_file(
        file_bytes,
        filename,
        source="portal",
        counterparty_id=session["counterparty_id"],
        metadata={"session_id": session["id"]},
    )

    # Queue all heavy processing in background — return immediately
    background_tasks.add_task(
        _process_portal_upload,
        db,
        session["id"],
        session["initiating_company_id"],
        session["counterparty_id"],
        file_bytes,
        filename,
        storage_id,
    )

    logger.info(f"[Portal/Upload] File {storage_id} saved, processing queued for session {session['id']}")

    return PortalUploadResponse(
        session_id=session["id"],
        parsed_count=0,
        message="File received. AI reconciliation analysis has started in the background.",
    )
