export interface Company {
  id: string
  name: string
  tax_id: string
  reconciliation_email: string
  contact_name: string
  status: 'active' | 'inactive'
  is_own_company: boolean
  created_at: string
  updated_at: string
}

export type ReconciliationSessionStatus =
  | 'pending_upload'
  | 'processing'
  | 'completed'
  | 'expired'

export interface ReconciliationSession {
  id: string
  initiating_company_id: string
  counterparty_id: string
  token: string
  expires_at: string
  status: ReconciliationSessionStatus
  created_at: string
  uploaded_at?: string | null
  parsed_ledger_count: number
  filename?: string | null
}

export interface TokenValidationResponse {
  valid: boolean
  session_id?: string | null
  initiating_company_name?: string | null
  counterparty_name?: string | null
  expires_at?: string | null
  message?: string | null
}

export interface PortalUploadResponse {
  session_id: string
  parsed_count: number
  message: string
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
  company_a_amount?: number | null
  company_b_amount?: number | null
  difference?: number | null
  ai_analysis: string
  email_draft?: string | null
  status: DiscrepancyStatus
  agent_run_id: string
  detected_at: string
  resolved_at?: string | null
}

export interface ReconciliationRunResult {
  status: string
  message: string
}
