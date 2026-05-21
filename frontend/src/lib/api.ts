import axios from 'axios'
import type { CompanySettings, OnboardingStatus, TokenResponse, User, Role } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT from lumina_token cookie to every backend request
api.interceptors.request.use(config => {
  if (typeof document !== 'undefined') {
    const raw = `; ${document.cookie}`
    const parts = raw.split('; lumina_token=')
    if (parts.length === 2) {
      const token = parts.pop()?.split(';').shift()
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Auto-redirect to login on 401
api.interceptors.response.use(
  response => response,
  error => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      document.cookie = 'lumina_token=; max-age=0; path=/'
      document.cookie = 'lumina_session=; max-age=0; path=/'
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

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

export const globalSearch = (q: string) =>
  api.get('/api/v1/search/', { params: { q } }).then(r => r.data)

export const getDiscrepancyAnalytics = (days: number = 90) =>
  api.get('/api/v1/discrepancies/analytics', { params: { days: days } }).then(r => r.data)

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

// ── Auth ─────────────────────────────────────────────────────────────────────

export const backendLogin = (username: string, password: string): Promise<TokenResponse> =>
  api.post('/api/v1/auth/login', { username, password }).then(r => r.data)

export const getCurrentUser = (): Promise<User> =>
  api.get('/api/v1/auth/me').then(r => r.data)

// ── Company Settings ─────────────────────────────────────────────────────────

export const getOnboardingStatus = (): Promise<OnboardingStatus> =>
  api.get('/api/v1/settings/onboarding-status').then(r => r.data)

export const getCompanySettings = (): Promise<CompanySettings> =>
  api.get('/api/v1/settings/').then(r => r.data)

export const createCompanySettings = (data: unknown): Promise<CompanySettings> =>
  api.post('/api/v1/settings/', data).then(r => r.data)

export const updateCompanySettings = (data: unknown): Promise<CompanySettings> =>
  api.patch('/api/v1/settings/', data).then(r => r.data)

export const uploadCompanyLogo = (file: File): Promise<{ logo_url: string }> => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/api/v1/settings/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// ── User Management ───────────────────────────────────────────────────────────

export const getUsers = (): Promise<User[]> =>
  api.get('/api/v1/users/').then(r => r.data)

export const createUser = (data: unknown): Promise<User> =>
  api.post('/api/v1/users/', data).then(r => r.data)

export const updateUser = (id: string, data: unknown): Promise<User> =>
  api.patch(`/api/v1/users/${id}`, data).then(r => r.data)

export const deleteUser = (id: string): Promise<void> =>
  api.delete(`/api/v1/users/${id}`).then(r => r.data)

export const getRoles = (): Promise<Role[]> =>
  api.get('/api/v1/users/roles').then(r => r.data)

export const createRole = (data: unknown): Promise<Role> =>
  api.post('/api/v1/users/roles', data).then(r => r.data)

export const updateRole = (id: string, data: unknown): Promise<Role> =>
  api.patch(`/api/v1/users/roles/${id}`, data).then(r => r.data)

export const deleteRole = (id: string): Promise<void> =>
  api.delete(`/api/v1/users/roles/${id}`).then(r => r.data)

// ── AI & Gemini ──────────────────────────────────────────────────────────────

export const chatWithGemini = (payload: {  
  message: string  
  context?: Record<string, unknown>  
  history?: { role: string; content: string }[]  
  page?: string
}) => api.post('/api/v1/gemini/chat', payload).then(r => r.data)