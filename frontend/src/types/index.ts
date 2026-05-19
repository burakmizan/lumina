export interface Company {
  id: string
  name: string
  tax_id: string
  reconciliation_email: string
  contact_name: string
  status: 'active' | 'inactive'
  is_own_company: boolean
  customer_code?: string | null
  phones: string[]
  emails: string[]
  created_at: string
  updated_at: string
}

export interface BulkImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export interface ErpIntegration {
  id: string
  name: string
  description?: string | null
  tracker_id: string
  key_prefix: string
  created_at: string
  last_used?: string | null
}

export interface ErpIntegrationCreated extends ErpIntegration {
  api_key: string
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
  storage_id?: string | null
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

export type MasterBalanceStatus = 'pending_match' | 'matched' | 'ready_for_external'

export interface MasterBalance {
  id: string
  company_name: string
  customer_code: string
  tax_id: string
  balance: number
  currency: string
  counterparty_id: string | null
  reconciliation_status: MasterBalanceStatus
  auto_created_counterparty: boolean
  created_at: string
  updated_at: string
}

export interface ImportMasterResult {
  imported: number
  matched: number
  auto_created: number
  records: MasterBalance[]
}

export interface StatementEntry {
  id: string
  transaction_ref: string
  description: string
  amount: number
  currency: string
  status: string
  created_at: string | null
  transaction_date: string | null
}

export interface SendMagicLinkResult {
  session_id: string
  token_preview: string
  counterparty_name: string
  counterparty_email: string
  email_sent: boolean
  message: string
}

// ── File storage ──────────────────────────────────────────────────────────────

export interface FileRecord {
  id: string
  filename: string
  source: string
  size: number
  counterparty_id?: string | null
  metadata: Record<string, string>
  created_at: string
}

export interface GlobalStatementRecord {
  id: string
  filename: string
  uploaded_at: string
  records_processed: number
  companies_affected: number
  size: number
  storage_id: string
}

export interface ImportStatementOfAccountResult {
  total_rows: number
  companies_matched: number
  records_saved: number
  skipped_rows: number
  details: Array<{ customer_code: string; company_name: string; rows_saved: number }>
}

export interface DeleteResponse {
  deleted: number
  message: string
}
