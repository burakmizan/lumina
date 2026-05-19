'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Building2, Mail, Hash, RefreshCw, Zap,
  PlayCircle, CheckCircle2, AlertCircle, Pencil,
  FolderOpen, X, FileSpreadsheet, FileText, Loader2,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Toast } from '@/components/ui/Toast'
import {
  getCompanies,
  startReconciliationSession,
  updateCompany,
  getCounterpartySessions,
} from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import type { Company, ReconciliationSession } from '@/types'

type ToastState = { message: string; variant: 'success' | 'error' } | null

// ── Edit Modal ─────────────────────────────────────────────────────────────

interface EditForm {
  name: string
  reconciliation_email: string
  contact_name: string
}

function EditModal({
  company,
  onClose,
  onSaved,
}: {
  company: Company
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<EditForm>({
    name: company.name,
    reconciliation_email: company.reconciliation_email,
    contact_name: company.contact_name,
  })

  const mutation = useMutation({
    mutationFn: () => updateCompany(company.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      onSaved()
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-secondary border border-surface-border rounded-2xl w-full max-w-[460px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-accent-blue" />
            <h2 className="text-sm font-semibold text-white">Edit Counterparty</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white p-1.5 rounded-lg hover:bg-surface-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-text-muted mb-1.5">
              Company Name
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 bg-surface-primary border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:border-accent-blue/50 placeholder:text-text-muted transition-colors"
              placeholder="Legal company name"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-text-muted mb-1.5">
              Tax ID / EIN / VAT Number
            </label>
            <input
              value={company.tax_id}
              readOnly
              className="w-full px-3 py-2.5 bg-surface-primary/50 border border-surface-border rounded-xl text-sm text-text-muted cursor-not-allowed"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Tax ID cannot be changed after creation.
            </p>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-text-muted mb-1.5">
              Accounting Email
            </label>
            <input
              type="email"
              value={form.reconciliation_email}
              onChange={e => setForm(f => ({ ...f, reconciliation_email: e.target.value }))}
              className="w-full px-3 py-2.5 bg-surface-primary border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:border-accent-blue/50 placeholder:text-text-muted transition-colors"
              placeholder="accounting@company.com"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-text-muted mb-1.5">
              Contact Name
            </label>
            <input
              value={form.contact_name}
              onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
              className="w-full px-3 py-2.5 bg-surface-primary border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:border-accent-blue/50 placeholder:text-text-muted transition-colors"
              placeholder="Full name of reconciliation contact"
            />
          </div>
        </div>

        {mutation.isError && (
          <p className="px-6 pb-2 text-xs text-red-400">
            Failed to save changes. Please try again.
          </p>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-white border border-surface-border hover:border-surface-tertiary rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name.trim()}
            className="px-4 py-2 text-sm font-semibold bg-accent-blue hover:bg-accent-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Docs Modal ─────────────────────────────────────────────────────────────

const SESSION_STATUS_CONFIG: Record<
  string,
  { label: string; cls: string }
> = {
  pending_upload: {
    label: 'Pending Upload',
    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  processing: {
    label: 'Processing',
    cls: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
  },
  completed: {
    label: 'Completed',
    cls: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  },
  expired: {
    label: 'Expired',
    cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
}

function DocsModal({
  company,
  onClose,
}: {
  company: Company
  onClose: () => void
}) {
  const { data: sessions = [], isLoading } = useQuery<ReconciliationSession[]>({
    queryKey: ['sessions', company.id],
    queryFn: () => getCounterpartySessions(company.id),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-secondary border border-surface-border rounded-2xl w-full max-w-[520px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="w-4 h-4 text-accent-blue flex-shrink-0" />
            <h2 className="text-sm font-semibold text-white">Uploaded Documents</h2>
            <span className="text-xs text-text-muted truncate">— {company.name}</span>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white p-1.5 rounded-lg hover:bg-surface-primary transition-colors flex-shrink-0 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-accent-blue animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-surface-primary border border-surface-border flex items-center justify-center mb-3">
                <FolderOpen className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-sm font-medium text-white mb-1">No documents yet</p>
              <p className="text-xs text-text-muted">
                Send a reconciliation invite to request a ledger upload from this partner.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {sessions.map(session => {
                const ext = session.filename?.split('.').pop()?.toLowerCase()
                const isPdf = ext === 'pdf'
                const statusCfg =
                  SESSION_STATUS_CONFIG[session.status] ?? SESSION_STATUS_CONFIG.pending_upload
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 bg-surface-primary rounded-xl border border-surface-border"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-secondary border border-surface-border flex items-center justify-center flex-shrink-0">
                      {isPdf ? (
                        <FileText className="w-4 h-4 text-red-400" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-accent-green" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {session.filename ?? 'Ledger upload'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5 flex-wrap">
                        {session.uploaded_at && (
                          <span>{formatDate(session.uploaded_at)}</span>
                        )}
                        {session.parsed_ledger_count > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-accent-green">
                              {session.parsed_ledger_count} records
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span className="font-mono text-[10px]">
                          …{session.id.slice(-8)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-md border font-medium flex-shrink-0',
                        statusCfg.cls,
                      )}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <p className="text-[11px] text-text-muted text-center">
            Showing all reconciliation sessions for {company.name}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CounterpartiesPage() {
  const [toast, setToast]             = useState<ToastState>(null)
  const [startingId, setStartingId]   = useState<string | null>(null)
  const [lastSession, setLastSession] = useState<ReconciliationSession | null>(null)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [docsCompany, setDocsCompany] = useState<Company | null>(null)

  const {
    data: companies = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: getCompanies,
  })

  const ownCompany    = companies.find(c => c.is_own_company) ?? companies[0]
  const counterparties = companies.filter(c => c.id !== ownCompany?.id)

  const startMutation = useMutation({
    mutationFn: ({ initiating, counterparty }: { initiating: string; counterparty: string }) =>
      startReconciliationSession(initiating, counterparty),
    onSuccess: (session: ReconciliationSession, vars) => {
      const cp = companies.find(c => c.id === vars.counterparty)
      setLastSession(session)
      setToast({
        variant: 'success',
        message: `Reconciliation invite sent to ${cp?.name ?? 'counterparty'}. Token: …${session.token.slice(-8)}`,
      })
      setStartingId(null)
    },
    onError: (err: Error) => {
      setToast({ variant: 'error', message: err.message || 'Failed to start reconciliation.' })
      setStartingId(null)
    },
  })

  function handleStart(counterpartyId: string) {
    if (!ownCompany) {
      setToast({ variant: 'error', message: 'Your company is not configured yet.' })
      return
    }
    setStartingId(counterpartyId)
    startMutation.mutate({ initiating: ownCompany.id, counterparty: counterpartyId })
  }

  return (
    <AppShell>
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Counterparties</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Counterparty management · initiate and track reconciliation workflows
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-white border border-surface-border hover:border-surface-tertiary rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Own company card ── */}
      {ownCompany && (
        <div className="mb-6 p-5 bg-surface-secondary border border-accent-green/20 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent-green/15 border border-accent-green/25 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-accent-green" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-accent-green mb-0.5">
              Your Company
            </p>
            <p className="text-sm font-semibold text-white">{ownCompany.name}</p>
            <p className="text-xs text-text-muted">
              Tax ID: {ownCompany.tax_id} · {ownCompany.reconciliation_email}
            </p>
          </div>
          <span className="text-[10px] px-2 py-1 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded-lg font-medium flex-shrink-0">
            Reconciliation Initiator
          </span>
        </div>
      )}

      {/* ── Counterparties table ── */}
      <div className="bg-surface-secondary border border-surface-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-blue" />
            <h2 className="text-sm font-semibold text-white">Counterparty Accounts</h2>
            {!isLoading && (
              <span className="text-xs text-text-muted">({counterparties.length})</span>
            )}
          </div>
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_130px_180px_100px_220px] gap-4 px-6 py-3 border-b border-surface-border bg-surface-primary/30">
          {['COMPANY NAME', 'TAX ID', 'EMAIL', 'STATUS', 'ACTION'].map(h => (
            <p
              key={h}
              className="text-[10px] font-medium uppercase tracking-widest text-text-muted"
            >
              {h}
            </p>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-surface-border border-t-accent-blue rounded-full animate-spin" />
          </div>
        ) : counterparties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <div className="w-12 h-12 rounded-2xl bg-surface-primary border border-surface-border flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-white font-medium mb-1">No counterparties found</p>
            <p className="text-text-muted text-sm">
              Run{' '}
              <code className="text-accent-green text-xs bg-surface-primary px-1.5 py-0.5 rounded-md">
                scripts/seed_mock_data.py
              </code>{' '}
              to populate with sample data.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {counterparties.map(company => {
              const isBusy  = startingId === company.id
              const isActive = company.status === 'active'

              return (
                <div
                  key={company.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_130px_180px_100px_220px] gap-3 md:gap-4 items-center px-6 py-4 hover:bg-surface-primary/30 transition-colors"
                >
                  {/* Company name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-accent-blue" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{company.name}</p>
                      <p className="text-xs text-text-muted truncate">{company.contact_name}</p>
                    </div>
                  </div>

                  {/* Tax ID */}
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Hash className="w-3 h-3 text-text-muted flex-shrink-0" />
                    <span className="font-mono">{company.tax_id}</span>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary min-w-0">
                    <Mail className="w-3 h-3 text-text-muted flex-shrink-0" />
                    <span className="truncate">{company.reconciliation_email}</span>
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border',
                        isActive
                          ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                      )}
                    >
                      {isActive && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-green" />
                        </span>
                      )}
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions: Docs · Edit · Send */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setDocsCompany(company)}
                      title="View uploaded documents"
                      className="p-2 rounded-xl border border-surface-border text-text-secondary hover:text-accent-blue hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-all"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setEditCompany(company)}
                      title="Edit counterparty"
                      className="p-2 rounded-xl border border-surface-border text-text-secondary hover:text-accent-blue hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleStart(company.id)}
                      disabled={isBusy || !isActive}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                        'border whitespace-nowrap',
                        isActive && !isBusy
                          ? 'bg-accent-green hover:bg-accent-green-hover text-white border-transparent shadow-sm'
                          : 'bg-surface-primary text-text-muted border-surface-border cursor-not-allowed opacity-50',
                      )}
                    >
                      {isBusy ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          Send
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Last session info ── */}
      {lastSession && (
        <div className="mt-4 p-4 bg-surface-secondary border border-accent-blue/20 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-accent-blue" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white mb-0.5">
              Reconciliation invite sent
            </p>
            <div className="flex items-center gap-4 flex-wrap text-xs text-text-muted">
              <span>
                Session ID:{' '}
                <span className="font-mono text-text-secondary">{lastSession.id}</span>
              </span>
              <span>
                Token:{' '}
                <span className="font-mono text-accent-green">…{lastSession.token.slice(-12)}</span>
              </span>
              <span>
                Expires:{' '}
                <span className="text-text-secondary">
                  {new Date(lastSession.expires_at).toLocaleString('en-US')}
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-accent-blue flex-shrink-0">
            <AlertCircle className="w-3 h-3" />
            <span>Email sent to counterparty</span>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {editCompany && (
        <EditModal
          company={editCompany}
          onClose={() => setEditCompany(null)}
          onSaved={() => {
            const name = editCompany.name
            setEditCompany(null)
            setToast({ variant: 'success', message: `${name} updated successfully.` })
          }}
        />
      )}

      {docsCompany && (
        <DocsModal
          company={docsCompany}
          onClose={() => setDocsCompany(null)}
        />
      )}
    </AppShell>
  )
}
