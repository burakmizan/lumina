from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import connect_to_mongo, close_mongo_connection
from api.routes import companies, ledgers, discrepancies, reconciliation, portal


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="Lumina API",
    description="Autonomous B2B Financial Reconciliation AI Agent — powered by Google Gemini & MongoDB",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router, prefix="/api/v1/companies", tags=["Companies"])
app.include_router(ledgers.router, prefix="/api/v1/ledgers", tags=["Ledgers"])
app.include_router(discrepancies.router, prefix="/api/v1/discrepancies", tags=["Discrepancies"])
app.include_router(reconciliation.router, prefix="/api/v1/reconciliation", tags=["Reconciliation"])
app.include_router(portal.router, prefix="/api/v1/portal", tags=["Portal"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "lumina-api"}
