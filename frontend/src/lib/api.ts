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
