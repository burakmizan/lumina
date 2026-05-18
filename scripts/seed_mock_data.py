"""
Phase 1 Mock Data Seeder
========================
Seeds MongoDB with realistic, intentionally flawed intercompany ledger data
to test the Lumina reconciliation agent end-to-end without a live ERP.

Expected discrepancies after seeding:
  REF-002 — amount_mismatch  (A: 80,000 TL vs B: 75,000 TL)
  REF-003 — missing_record   (only in Company A; absent from B)
  REF-004 — date_mismatch    (same amount, different booking dates)

Usage:
    cd lumina
    python scripts/seed_mock_data.py
"""
import asyncio
import os
from datetime import datetime, timedelta

import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "lumina_db")

COMPANY_A_DOC = {
    "name": "Alfa Ticaret A.Ş.",
    "tax_id": "1234567890",
    "reconciliation_email": "muhasebe@alfa.com.tr",
    "contact_name": "Ahmet Yılmaz",
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow(),
}

COMPANY_B_DOC = {
    "name": "Beta Lojistik Ltd. Şti.",
    "tax_id": "9876543210",
    "reconciliation_email": "finans@beta.com.tr",
    "contact_name": "Fatma Kaya",
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow(),
}


def ledger(company_id, counterparty_id, ref, amount, tx_type, date, desc=""):
    return {
        "company_id": company_id,
        "counterparty_id": counterparty_id,
        "transaction_ref": ref,
        "transaction_type": tx_type,
        "amount": amount,
        "currency": "TRY",
        "transaction_date": date,
        "due_date": date + timedelta(days=30),
        "description": desc,
        "status": "pending",
        "source": "seed_script",
        "raw_data": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


async def seed():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]

    await db.companies.drop()
    await db.ledgers.drop()
    await db.discrepancies.drop()
    print("Dropped existing collections.")

    res_a = await db.companies.insert_one(COMPANY_A_DOC)
    res_b = await db.companies.insert_one(COMPANY_B_DOC)
    a_id, b_id = str(res_a.inserted_id), str(res_b.inserted_id)
    print(f"Company A: {COMPANY_A_DOC['name']} → {a_id}")
    print(f"Company B: {COMPANY_B_DOC['name']} → {b_id}")

    base = datetime(2024, 5, 1)
    records = [
        # REF-001 — matching invoice, no discrepancy
        ledger(a_id, b_id, "REF-001", 50_000.00, "invoice", base, "Danışmanlık hizmet faturası"),
        ledger(b_id, a_id, "REF-001", 50_000.00, "invoice", base, "Danışmanlık hizmet faturası"),

        # REF-002 — AMOUNT MISMATCH: A says 80k, B says 75k
        ledger(a_id, b_id, "REF-002", 80_000.00, "invoice", base + timedelta(5), "Yazılım lisans faturası"),
        ledger(b_id, a_id, "REF-002", 75_000.00, "invoice", base + timedelta(5), "Yazılım lisans faturası"),

        # REF-003 — MISSING RECORD: only in Company A
        ledger(a_id, b_id, "REF-003", 12_500.00, "payment", base + timedelta(10), "Kısmi ödeme"),

        # REF-004 — DATE MISMATCH: same amount, different booking dates
        ledger(a_id, b_id, "REF-004", 35_000.00, "invoice", base + timedelta(14), "Lojistik hizmet faturası"),
        ledger(b_id, a_id, "REF-004", 35_000.00, "invoice", base + timedelta(20), "Lojistik hizmet faturası"),

        # REF-005 — matching payment, no discrepancy
        ledger(a_id, b_id, "REF-005", 50_000.00, "payment", base + timedelta(30), "REF-001 ödemesi"),
        ledger(b_id, a_id, "REF-005", 50_000.00, "payment", base + timedelta(30), "REF-001 ödemesi"),
    ]

    result = await db.ledgers.insert_many(records)
    print(f"\nInserted {len(result.inserted_ids)} ledger records.")
    print("\n── Seed complete ───────────────────────────────────────────")
    print(f"  COMPANY_A_ID = {a_id}")
    print(f"  COMPANY_B_ID = {b_id}")
    print("\nExpected discrepancies after running reconciliation agent:")
    print("  REF-002  amount_mismatch   (80,000 vs 75,000 TL)")
    print("  REF-003  missing_record    (Company B has no record)")
    print("  REF-004  date_mismatch     (1 May+14d vs 1 May+20d)")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
