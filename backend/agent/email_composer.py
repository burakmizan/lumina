"""
Email Composer — Jinja2 template helpers for structured email prompting.
Used by GeminiAgent to provide a consistent format hint in its prompts.
"""
from jinja2 import Template

RECONCILIATION_EMAIL_TEMPLATE = """\
Sayın {{ recipient_name }},

{{ company_a_name }} Muhasebe Departmanı olarak, {{ ledger_ref }} referans \
numaralı işleme ilişkin mutabakat talebimizi iletmekteyiz.

Kayıtlarımıza göre işlem detayları:
  - İşlem Tutarı   : {{ amount_a | float | round(2) }} {{ currency }}
  - İşlem Tarihi   : {{ transaction_date }}
  - İşlem Türü     : {{ transaction_type }}

Ancak söz konusu kaydın tarafınızdaki tutarı \
{{ amount_b | float | round(2) }} {{ currency }} olarak görünmektedir. \
Aradaki {{ difference | float | round(2) }} {{ currency }} tutarındaki \
farkın incelenmesini ve tarafımıza yazılı olarak bildirilmesini rica ederiz.

Saygılarımızla,
{{ contact_name }}
{{ company_a_name }} Muhasebe Departmanı
"""


def render_email_template(context: dict) -> str:
    return Template(RECONCILIATION_EMAIL_TEMPLATE).render(**context)
