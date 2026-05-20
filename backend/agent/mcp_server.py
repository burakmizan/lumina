#!/usr/bin/env python
"""
Lumina MongoDB MCP Server (Python-native)
==========================================
Motor-backed MCP server. Runs as a stdio subprocess.
No Node.js required — pure Python.

Tools: find, aggregate, insert_one, update_one
"""
import asyncio
import json
import os
import sys

# Subprocess olarak çalışırken backend/ dizinini path'e ekle
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import motor.motor_asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

MONGODB_URI    = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "lumina_db")

app = Server("lumina-mongodb-mcp")
_mongo_client = None
_db = None


def get_db():
    global _mongo_client, _db
    if _db is None:
        _mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
        _db = _mongo_client[MONGODB_DB_NAME]
    return _db


def _serialize(obj):
    """ObjectId ve datetime'ı JSON-safe string'e çevir."""
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    cls = type(obj).__name__
    if cls in ("ObjectId", "datetime", "Decimal128"):
        return str(obj)
    return obj


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="find",
            description="Find documents in a MongoDB collection",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "filter":     {"type": "object"},
                    "limit":      {"type": "integer", "default": 500},
                },
                "required": ["collection", "filter"],
            },
        ),
        Tool(
            name="aggregate",
            description="Run an aggregation pipeline on a MongoDB collection",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "pipeline":   {"type": "array", "items": {"type": "object"}},
                },
                "required": ["collection", "pipeline"],
            },
        ),
        Tool(
            name="insert_one",
            description="Insert a document into a MongoDB collection",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "document":   {"type": "object"},
                },
                "required": ["collection", "document"],
            },
        ),
        Tool(
            name="update_one",
            description="Update a document in a MongoDB collection",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "filter":     {"type": "object"},
                    "update":     {"type": "object"},
                    "upsert":     {"type": "boolean", "default": False},
                },
                "required": ["collection", "filter", "update"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    db         = get_db()
    col_name   = arguments.get("collection", "")
    collection = db[col_name]

    try:
        if name == "find":
            query  = arguments.get("filter", {})
            limit  = int(arguments.get("limit", 500))
            docs   = []
            async for doc in collection.find(query).limit(limit):
                doc["_id"] = str(doc["_id"])
                docs.append(_serialize(doc))
            return [TextContent(type="text", text=json.dumps(docs))]

        elif name == "aggregate":
            pipeline = arguments.get("pipeline", [])
            results  = []
            async for doc in collection.aggregate(pipeline):
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                results.append(_serialize(doc))
            return [TextContent(type="text", text=json.dumps(results))]

        elif name == "insert_one":
            result = await collection.insert_one(arguments.get("document", {}))
            return [TextContent(type="text", text=json.dumps(
                {"inserted_id": str(result.inserted_id)}
            ))]

        elif name == "update_one":
            result = await collection.update_one(
                arguments.get("filter", {}),
                arguments.get("update", {}),
                upsert=arguments.get("upsert", False),
            )
            return [TextContent(type="text", text=json.dumps({
                "matched_count":  result.matched_count,
                "modified_count": result.modified_count,
                "upserted_id":    str(result.upserted_id) if result.upserted_id else None,
            }))]

        else:
            return [TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))]

    except Exception as exc:
        return [TextContent(type="text", text=json.dumps({"error": str(exc)}))]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())