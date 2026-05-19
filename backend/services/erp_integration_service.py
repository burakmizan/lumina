"""
ERP Integration service — API key management and local agent package builder.

Security model:
  - Raw API key is generated with secrets.token_urlsafe and returned ONCE on creation.
  - bcrypt hash is stored in MongoDB; the raw key is never persisted.
  - "Download Agent Package" regenerates a fresh key (invalidating any previous one)
    and embeds it in the returned ZIP.
  - ZIP generation runs in a ThreadPoolExecutor for Windows ProactorEventLoop safety.
"""

import io
import json
import secrets
import uuid
import zipfile
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

_AGENT_INSTALL_GUIDE = """\
# Lumina Local ERP Agent — Installation Guide

## Overview
This package contains the Lumina local synchronization agent. It runs on your company's
internal network and pushes ERP/accounting data to the Lumina cloud platform.

## Contents
  lumina-agent.exe       — Agent executable (Windows x64)
  config.json            — Pre-configured credentials (DO NOT share this file)
  INSTALLATION_GUIDE.md  — This document

## Prerequisites
  - Windows 10 / Server 2016 or later (x64)
  - Network access to the Lumina API endpoint listed in config.json
  - Firewall rule: outbound HTTPS (port 443) to the server URL

## Quick Start
  1. Place all three files in the same directory (e.g., C:\\Lumina\\Agent\\)
  2. Right-click lumina-agent.exe → Run as administrator
  3. The agent reads config.json automatically on startup
  4. A log file (lumina-agent.log) is created in the same directory

## Scheduled Synchronization (Recommended)
  Use Windows Task Scheduler to run the agent on a fixed interval:

    Action  : Start a program → lumina-agent.exe
    Trigger : Daily / Every 6 hours (adjust to your ERP update frequency)
    Settings: Run whether user is logged on or not

## Security Notes
  - The API key in config.json grants write access to your Lumina workspace.
    Treat it like a password: do not commit it to source control or share it.
  - The tracker_id uniquely identifies this agent instance in the audit log.
  - Rotate the API key from the Lumina dashboard (ERP Integration → Regenerate Key).

## Configuration Reference (config.json)
  server_url   : Base URL of the Lumina API
  api_key      : Bearer token — prefix all requests with Authorization: Bearer <api_key>
  tracker_id   : Unique UUID stamped to every sync event for traceability
  created_at   : ISO-8601 timestamp of when this package was generated

## Support
  Open an issue at https://github.com/your-org/lumina or email support@lumina.ai
"""

_AGENT_EXE_STUB = (
    b"LUMINA-AGENT-PLACEHOLDER\n"
    b"This binary is a placeholder for the actual compiled agent.\n"
    b"Replace with the production executable before deployment.\n"
)


def _build_zip(config: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("config.json", json.dumps(config, indent=2, default=str))
        zf.writestr("INSTALLATION_GUIDE.md", _AGENT_INSTALL_GUIDE)
        zf.writestr("lumina-agent.exe", _AGENT_EXE_STUB)
    return buf.getvalue()


class ErpIntegrationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.col = db["erp_integrations"]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _serialize(doc: dict) -> dict:
        doc["id"] = str(doc.pop("_id"))
        doc.pop("key_hash", None)
        return doc

    # ── CRUD ─────────────────────────────────────────────────────────────────

    async def list_all(self) -> list[dict]:
        result = []
        async for doc in self.col.find():
            result.append(self._serialize(doc))
        return result

    async def create(self, name: str, description: Optional[str]) -> dict:
        raw_key = f"lmn_{secrets.token_urlsafe(32)}"
        key_hash = _pwd_ctx.hash(raw_key)
        tracker_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        doc = {
            "name": name,
            "description": description,
            "tracker_id": tracker_id,
            "key_hash": key_hash,
            "key_prefix": raw_key[:14] + "…",
            "created_at": now,
            "last_used": None,
        }
        result = await self.col.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("key_hash")
        doc["api_key"] = raw_key
        return doc

    async def delete(self, integration_id: str) -> bool:
        if not ObjectId.is_valid(integration_id):
            return False
        res = await self.col.delete_one({"_id": ObjectId(integration_id)})
        return res.deleted_count > 0

    # ── Agent package ─────────────────────────────────────────────────────────

    async def build_agent_package(self, integration_id: str, server_url: str) -> Optional[tuple[bytes, str]]:
        """
        Regenerates the API key (invalidating any previous one), persists the new hash,
        and returns (zip_bytes, filename).
        """
        if not ObjectId.is_valid(integration_id):
            return None

        doc = await self.col.find_one({"_id": ObjectId(integration_id)})
        if not doc:
            return None

        raw_key = f"lmn_{secrets.token_urlsafe(32)}"
        key_hash = _pwd_ctx.hash(raw_key)
        now = datetime.now(timezone.utc)

        await self.col.update_one(
            {"_id": ObjectId(integration_id)},
            {"$set": {"key_hash": key_hash, "key_prefix": raw_key[:14] + "…", "last_used": now}},
        )

        config = {
            "agent_metadata": {
                "integration_name": doc["name"],
                "tracker_id": doc["tracker_id"],
                "version": "1.0.4-enterprise",
                "created_at": now.isoformat(),
                "environment": "production"
            },
            "lumina_cloud": {
                "server_url": server_url,
                "api_key": raw_key,
                "timeout_seconds": 30
            },
            "erp_connection": {
                "driver": "excel",  # options: "sap_hana", "logo_tiger", "mikro_v16", "excel"
                "database_host": "192.168.1.100",
                "database_port": 1433,
                "database_name": "ERP_PROD_DB",
                "database_user": "sa",
                "database_password": "FILL_IN_YOUR_PASSWORD",
                "local_file_path": "C:\\Lumina\\Agent\\data\\erp_export.xlsx"
            },
            "sync_settings": {
                "poll_interval_seconds": 3600,
                "batch_size": 5000,
                "max_retries": 3,
                "auto_update": True
            }
        }

        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=1) as pool:
            zip_bytes = await loop.run_in_executor(pool, _build_zip, config)

        filename = f"lumina-agent-package-{doc['tracker_id'][:8]}.zip"
        return zip_bytes, filename
