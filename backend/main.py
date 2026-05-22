import sys
import asyncio
import logging
logging.basicConfig(level=logging.INFO)
logging.getLogger("agent").setLevel(logging.INFO)
logging.getLogger("services").setLevel(logging.INFO)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.database import connect_to_mongo, close_mongo_connection
from api.routes import (
    companies, ledgers, discrepancies, reconciliation,
    portal, reconciliations, erp_integration, search, gemini_chat,
)
from api.routes import auth as auth_routes
from api.routes import settings as settings_routes
from api.routes import users_mgmt


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


# Ensure upload directories exist before StaticFiles mount
_uploads_dir = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(os.path.join(_uploads_dir, "logos"), exist_ok=True)


app = FastAPI(
    title="Lumina API",
    description="Autonomous B2B Financial Reconciliation AI Agent — powered by Google Gemini & MongoDB",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (logos etc.) as static assets
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_routes.router,       prefix="/api/v1/auth",       tags=["Auth"])
app.include_router(settings_routes.router,   prefix="/api/v1/settings",   tags=["Settings"])
app.include_router(users_mgmt.router,        prefix="/api/v1/users",      tags=["Users"])
app.include_router(companies.router,         prefix="/api/v1/companies",  tags=["Companies"])
app.include_router(ledgers.router,           prefix="/api/v1/ledgers",    tags=["Ledgers"])
app.include_router(discrepancies.router,     prefix="/api/v1/discrepancies", tags=["Discrepancies"])
app.include_router(reconciliation.router,    prefix="/api/v1/reconciliation", tags=["Reconciliation"])
app.include_router(portal.router,            prefix="/api/v1/portal",     tags=["Portal"])
app.include_router(reconciliations.router,   prefix="/api/v1/reconciliations", tags=["Reconciliations"])
app.include_router(erp_integration.router,   prefix="/api/v1/erp",        tags=["ERP Integration"])
app.include_router(search.router,            prefix="/api/v1/search",     tags=["Search"])
app.include_router(gemini_chat.router,       prefix="/api/v1/gemini",     tags=["Gemini Chat"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "lumina-api", "version": "0.2.0"}
