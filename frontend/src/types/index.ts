export interface Company {
  id: string
  name: string
  tax_id: string
  reconciliation_email: string
  contact_name: string
  created_at: string
  updated_at: string
}

export type TransactionType = 'invoice' | 'payment' | 'credit_note' | 'debit_note'
export type LedgerStatus = 'pending' | 'matched' | 'unmatched' | 'disputed'

export interface Ledger {
  id: string
  company_id: string
  counterparty_id: string
  transaction_ref: string
  transaction_type: TransactionType
  amount: number
  currency: string
  transaction_date: string
  due_date?: string
  description: string
  status: LedgerStatus
  source: string
  created_at: string
  updated_at: string
}

export type DiscrepancyType =
  | 'amount_mismatch'
  | 'missing_record'
  | 'date_mismatch'
  | 'duplicate'

export type DiscrepancyStatus =
  | 'detected'
  | 'awaiting_approval'
  | 'email_sent'
  | 'resolved'
  | 'disputed'

export interface Discrepancy {
  id: string
  company_a_id: string
  company_b_id: string
  ledger_ref: string
  discrepancy_type: DiscrepancyType
  company_a_amount?: number
  company_b_amount?: number
  difference?: number
  ai_analysis: string
  email_draft?: string
  status: DiscrepancyStatus
  agent_run_id: string
  detected_at: string
  resolved_at?: string
}

export interface ReconciliationRunResult {
  status: string
  message: string
}
