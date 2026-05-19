import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Companies ────────────────────────────────────────────────────────────────
export const getCompanies = () =>
  api.get('/api/v1/companies/').then(r => r.data)

export const createCompany = (data: unknown) =>
  api.post('/api/v1/companies/', data).then(r => r.data)

export const updateCompany = (
  id: string,
  data: { name?: string; reconciliation_email?: string; contact_name?: string },
) =>
  api.patch(`/api/v1/companies/${id}`, data).then(r => r.data)

export const deleteCompany = (id: string) =>
  api.delete(`/api/v1/companies/${id}`).then(r => r.data)

export const bulkDeleteCompanies = (ids: string[]) =>
  api.post('/api/v1/companies/bulk-delete', { ids }).then(r => r.data)

// ── Ledgers ──────────────────────────────────────────────────────────────────
export const getLedgers = (params?: Record<string, string>) =>
  api.get('/api/v1/ledgers/', { params }).then(r => r.data)

// ── Discrepancies ─────────────────────────────────────────────────────────────
export const getDiscrepancies = (params?: Record<string, string>) =>
  api.get('/api/v1/discrepancies/', { params }).then(r => r.data)

export const approveDiscrepancy = (id: string) =>
  api.post(`/api/v1/discrepancies/${id}/approve`).then(r => r.data)

// ── Reconciliation ────────────────────────────────────────────────────────────
export const triggerReconciliation = (companyAId: string, companyBId: string) =>
  api
    .post('/api/v1/reconciliation/run', null, {
      params: { company_a_id: companyAId, company_b_id: companyBId },
    })
    .then(r => r.data)

// ── Portal ────────────────────────────────────────────────────────────────────
export const startReconciliationSession = (
  initiating_company_id: string,
  counterparty_id: string,
) =>
  api
    .post('/api/v1/portal/sessions/start', { initiating_company_id, counterparty_id })
    .then(r => r.data)

export const validatePortalToken = (token: string) =>
  api.get(`/api/v1/portal/sessions/validate/${token}`).then(r => r.data)

export const getCounterpartySessions = (counterpartyId: string) =>
  api.get(`/api/v1/portal/sessions/counterparty/${counterpartyId}`).then(r => r.data)

export const deleteSessionFile = (sessionId: string) =>
  api.delete(`/api/v1/portal/sessions/${sessionId}/file`).then(r => r.data)

export const uploadPortalFile = (token: string, file: File) => {
  const form = new FormData()
  form.append('token', token)
  form.append('file', file)
  return api
    .post('/api/v1/portal/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data)
}

// ── Master Balances / Reconciliations ────────────────────────────────────────
export const getMasterBalances = () =>
  api.get('/api/v1/reconciliations/').then(r => r.data)

export const importMasterBalances = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post('/api/v1/reconciliations/import-master', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data)
}

export const importStatementOfAccount = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post('/api/v1/reconciliations/import-statement-of-account', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data)
}

export const uploadInternalStatement = (counterpartyId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post(`/api/v1/reconciliations/upload-statement/${counterpartyId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data)
}

export const getStatementEntries = (counterpartyId: string) =>
  api.get(`/api/v1/reconciliations/statements/${counterpartyId}`).then(r => r.data)

export const getStatementFiles = (counterpartyId: string) =>
  api.get(`/api/v1/reconciliations/statement-files/${counterpartyId}`).then(r => r.data)

export const sendMagicLinkFromReconciliation = (counterpartyId: string) =>
  api.post(`/api/v1/reconciliations/send-magic-link/${counterpartyId}`).then(r => r.data)

export const deleteMasterBalance = (id: string) =>
  api.delete(`/api/v1/reconciliations/${id}`).then(r => r.data)

export const bulkDeleteMasterBalances = (ids: string[]) =>
  api.post('/api/v1/reconciliations/bulk-delete', { ids }).then(r => r.data)

export const getGlobalStatements = () =>
  api.get('/api/v1/reconciliations/global-statements').then(r => r.data)

export const deleteGlobalStatement = (id: string) =>
  api.delete(`/api/v1/reconciliations/global-statements/${id}`).then(r => r.data)

export const deleteStorageFile = (storageId: string) =>
  api.delete(`/api/v1/reconciliations/files/${storageId}`).then(r => r.data)

// ── File download helper ──────────────────────────────────────────────────────

export async function triggerFileDownload(url: string, fallbackFilename: string): Promise<void> {
  const response = await api.get(url, { responseType: 'blob' })
  const contentDisposition = response.headers['content-disposition'] as string | undefined
  let filename = fallbackFilename
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match) filename = match[1]
  }
  const blob = new Blob([response.data as BlobPart], {
    type: response.headers['content-type'] as string,
  })
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(blobUrl)
}

export const downloadSessionFile = (sessionId: string, filename: string) =>
  triggerFileDownload(`/api/v1/portal/sessions/${sessionId}/download`, filename)

export const downloadStorageFile = (storageId: string, filename: string) =>
  triggerFileDownload(`/api/v1/reconciliations/files/${storageId}/download`, filename)

export const downloadGlobalStatement = (id: string, filename: string) =>
  triggerFileDownload(`/api/v1/reconciliations/global-statements/${id}/download`, filename)

// ── Counterparty bulk import ───────────────────────────────────────────────────

export const importCounterparties = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post('/api/v1/companies/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data)
}

// ── Excel template downloads ───────────────────────────────────────────────────

export const downloadCounterpartiesTemplate = () =>
  triggerFileDownload('/api/v1/companies/template', 'lumina_template_counterparties.xlsx')

export const downloadMasterBalancesTemplate = () =>
  triggerFileDownload('/api/v1/reconciliations/template/master-balances', 'lumina_template_master_balances.xlsx')

export const downloadStatementOfAccountTemplate = () =>
  triggerFileDownload('/api/v1/reconciliations/template/statement-of-account', 'lumina_template_statement_of_account.xlsx')

export const downloadInternalStatementTemplate = () =>
  triggerFileDownload('/api/v1/reconciliations/template/internal-statement', 'lumina_template_internal_statement.xlsx')

// ── ERP Integration ────────────────────────────────────────────────────────────

export const getErpIntegrations = () =>
  api.get('/api/v1/erp/').then(r => r.data)

export const createErpIntegration = (data: { name: string; description?: string }) =>
  api.post('/api/v1/erp/', data).then(r => r.data)

export const deleteErpIntegration = (id: string) =>
  api.delete(`/api/v1/erp/${id}`).then(r => r.data)

export const downloadAgentPackage = (id: string, filename: string) =>
  triggerFileDownload(`/api/v1/erp/${id}/download-agent`, filename)
