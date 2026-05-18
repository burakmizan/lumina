"""
MongoDB MCP Client (Phase 2)
============================
Connects to the MongoDB Atlas MCP Server so the Gemini agent can query
the database directly via structured tool calls instead of raw pymongo.

Docs: https://www.mongodb.com/docs/atlas/ai/mcp-server/
MCP SDK: https://github.com/modelcontextprotocol/python-sdk
"""
import logging
from core.config import settings

logger = logging.getLogger(__name__)


class MCPMongoClient:
    """
    Wraps the MongoDB MCP server connection for use by the reconciliation engine.
    Phase 2 implementation: replaces direct motor calls with MCP tool calls,
    letting Gemini reason over live database state via its tool-use interface.
    """

    def __init__(self):
        self.mongodb_uri = settings.MONGODB_URI
        self.db_name = settings.MONGODB_DB_NAME
        self._session = None

    async def connect(self):
        """Initialize the MCP session with the MongoDB server."""
        # TODO Phase 2: Initialize mcp.ClientSession pointed at MongoDB MCP server
        logger.info("[MCP] MongoDB MCP client connection — Phase 2 implementation pending.")

    async def disconnect(self):
        if self._session:
            await self._session.close()

    async def query_collection(self, collection: str, query: dict) -> list:
        """Route a MongoDB query through the MCP tool interface."""
        # TODO Phase 2: Use mcp session.call_tool("find", ...)
        raise NotImplementedError("MCP query routing implemented in Phase 2.")

    async def get_ledgers_for_pair(self, company_a_id: str, company_b_id: str) -> dict:
        """Fetch all ledger records for a counterparty pair — used by the reconciliation engine."""
        # TODO Phase 2: Replace with MCP tool calls so Gemini can introspect the query
        return {"company_a_ledgers": [], "company_b_ledgers": []}
