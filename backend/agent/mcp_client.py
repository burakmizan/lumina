"""
MongoDB MCP Client — In-Process Mode
======================================
Windows'ta subprocess stdio deadlock yaşandığı için mcp_server.py'ın
tool handler'larını doğrudan çağırır. MCP tool interface korunur.
"""
import json
import logging
from typing import Any

from core.config import settings

logger = logging.getLogger(__name__)


class MCPMongoClient:
    """In-process MCP client — tool calls via mcp_server handler."""

    def __init__(self):
        self.db_name = settings.MONGODB_DB_NAME

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def _call_tool(self, tool_name: str, arguments: dict) -> Any:
        from agent import mcp_server
        logger.info(f"[MCP] tool_call → {tool_name}  col={arguments.get('collection', '')}")
        content_list = await mcp_server.call_tool(tool_name, arguments)
        if content_list:
            raw = getattr(content_list[0], "text", "[]")
            try:
                return json.loads(raw)
            except Exception:
                return []
        return []

    async def get_ledgers_for_pair(self, company_a_id: str, company_b_id: str) -> dict:
        logger.info(f"[MCP] Fetching ledger pair: {company_a_id} ↔ {company_b_id}")

        a_ledgers = await self._call_tool("find", {
            "collection": "ledgers",
            "filter":     {"company_id": company_a_id, "counterparty_id": company_b_id},
            "limit":      500,
        })
        b_ledgers = await self._call_tool("find", {
            "collection": "ledgers",
            "filter":     {"company_id": company_b_id, "counterparty_id": company_a_id},
            "limit":      500,
        })

        if not isinstance(a_ledgers, list): a_ledgers = []
        if not isinstance(b_ledgers, list): b_ledgers = []

        logger.info(f"[MCP] ✓ A={len(a_ledgers)} B={len(b_ledgers)} records")
        return {"company_a_ledgers": a_ledgers, "company_b_ledgers": b_ledgers}

    async def aggregate(self, collection: str, pipeline: list) -> list:
        result = await self._call_tool("aggregate", {
            "collection": collection,
            "pipeline":   pipeline,
        })
        return result if isinstance(result, list) else []