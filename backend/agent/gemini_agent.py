import json
import google.generativeai as genai
from core.config import settings
import logging

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """
You are Lumina, an expert autonomous B2B financial reconciliation AI agent.
Your mission is to analyze intercompany ledger records from MongoDB, identify
discrepancies between two companies' books, determine the root cause of each
mismatch, and draft professional reconciliation emails in Turkish.

Guidelines:
- Be precise with amounts, dates, currencies, and reference numbers.
- Classify each discrepancy as one of: amount_mismatch, missing_record, date_mismatch, duplicate.
- Root cause analysis must be concise (2-3 sentences) and actionable.
- Draft emails in formal Turkish, addressed to the counterparty's muhasebe yetkilisi.
- Always return valid JSON with keys "analysis" and "email_draft".
"""


class GeminiAgent:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=SYSTEM_INSTRUCTION,
        )

    async def analyze_discrepancy(
        self,
        company_a: dict,
        company_b: dict,
        ledger_ref: str,
        records: dict,
    ) -> dict:
        prompt = f"""
Analyze this intercompany ledger discrepancy and return a JSON object.

Company A: {company_a.get('name')} (Vergi No: {company_a.get('tax_id')})
Company B: {company_b.get('name')} (Vergi No: {company_b.get('tax_id')})
Transaction Reference: {ledger_ref}

Company A Record: {json.dumps(records.get('company_a_record'), ensure_ascii=False, default=str)}
Company B Record: {json.dumps(records.get('company_b_record'), ensure_ascii=False, default=str)}

Return ONLY valid JSON with this exact structure:
{{
  "analysis": "<2-3 sentence root cause analysis in English>",
  "email_draft": "<formal reconciliation email body in Turkish>"
}}
"""
        try:
            response = await self.model.generate_content_async(prompt)
            text = response.text.strip()
            # Strip markdown fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except Exception as e:
            logger.error(f"Gemini response parsing failed for ref {ledger_ref}: {e}")
            return {"analysis": f"Analysis pending (parse error: {e})", "email_draft": ""}

    async def chat(self, message: str) -> str:
        response = await self.model.generate_content_async(message)
        return response.text
