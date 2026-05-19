from motor.motor_asyncio import AsyncIOMotorDatabase
from models.company import CompanyCreate, CompanyUpdate
from bson import ObjectId
from datetime import datetime
from typing import List, Optional


class CompanyService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["companies"]

    async def get_all(self) -> List[dict]:
        docs = []
        async for doc in self.collection.find():
            doc["id"] = str(doc.pop("_id"))
            doc.setdefault("status", "active")
            doc.setdefault("is_own_company", False)
            docs.append(doc)
        return docs

    async def get_by_id(self, company_id: str) -> Optional[dict]:
        if not ObjectId.is_valid(company_id):
            return None
        doc = await self.collection.find_one({"_id": ObjectId(company_id)})
        if doc:
            doc["id"] = str(doc.pop("_id"))
            doc.setdefault("status", "active")
            doc.setdefault("is_own_company", False)
        return doc

    async def get_own_company(self) -> Optional[dict]:
        doc = await self.collection.find_one({"is_own_company": True})
        if not doc:
            doc = await self.collection.find_one({})
        if doc:
            doc["id"] = str(doc.pop("_id"))
            doc.setdefault("status", "active")
            doc.setdefault("is_own_company", False)
        return doc

    async def create(self, payload: CompanyCreate) -> dict:
        now = datetime.utcnow()
        doc = payload.model_dump()
        doc["created_at"] = now
        doc["updated_at"] = now
        result = await self.collection.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        return doc

    async def update(self, company_id: str, payload: CompanyUpdate) -> Optional[dict]:
        if not ObjectId.is_valid(company_id):
            return None
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        updates["updated_at"] = datetime.utcnow()
        doc = await self.collection.find_one_and_update(
            {"_id": ObjectId(company_id)},
            {"$set": updates},
            return_document=True,
        )
        if doc:
            doc["id"] = str(doc.pop("_id"))
            doc.setdefault("status", "active")
            doc.setdefault("is_own_company", False)
        return doc

    async def delete(self, company_id: str) -> bool:
        if not ObjectId.is_valid(company_id):
            return False
        result = await self.collection.delete_one({"_id": ObjectId(company_id)})
        return result.deleted_count > 0
