'use client'
import { X, Zap, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import { TypeBadge, StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Company, Discrepancy } from '@/types'

interface Props {
  discrepancy: Discrepancy
  companyMap: Record<string, Company>
  onClose: () => void
  onApprove: () => void
  isApproving: boolean
  approveError?: string | null
}

export function DiscrepancyModal({
  discrepancy: disc,
  companyMap,
  onClose,
  onApprove,
  isApproving,
  approveError,
}: Props) {
  const companyA = companyMap[disc.company_a_id]
  const companyB = companyMap[disc.company_b_id]
  const canApprove = disc.status === 'awaiting_approval'
  const isResolved = ['resolved', 'email_sent'].includes(disc.status)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-surface-border rounded-2xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-surface-secondary border-b border-surface-border px-6 py-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <TypeBadge type={disc.discrepancy_type} />
              <StatusBadge status={disc.status} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Transaction Ref: <span className="font-mono">{disc.ledger_ref}</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Detected {formatDate(disc.detected_at)}
              {disc.resolved_at && ` · Resolved ${formatDate(disc.resolved_at)}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Amount Comparison ── */}
        <div className="px-6 py-5 border-b border-surface-border">
          <p className="text-[11px] uppercase tracking-widest text-text-muted mb-3">Amount Comparison</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-text-muted mb-1 truncate" title={companyA?.name}>
                {companyA?.name ?? 'Company A'}
              </p>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(disc.company_a_amount)}
              </p>
              {companyA?.reconciliation_email && (
                <p className="text-[10px] text-text-muted mt-1 truncate">{companyA.reconciliation_email}</p>
              )}
            </div>

            <div className="rounded-xl p-4 border border-red-500/25 bg-red-500/10 flex flex-col items-center justify-center text-center">
              <p className="text-[11px] text-text-muted mb-1">Difference</p>
              <p className="text-xl font-bold text-red-400">
                {disc.difference != null ? formatCurrency(disc.difference) : '—'}
              </p>
              <p className="text-[10px] text-red-400/60 mt-1">unreconciled</p>
            </div>

            <div className="bg-surface-primary rounded-xl p-4 border border-surface-border">
              <p className="text-xs text-text-muted mb-1 truncate" title={companyB?.name}>
                {companyB?.name ?? 'Company B'}
              </p>
              <p className="text-xl font-bold text-slate-900">
                {disc.company_b_amount != null
                  ? formatCurrency(disc.company_b_amount)
                  : <span className="text-red-400 text-base">NOT FOUND</span>}
              </p>
              {companyB?.reconciliation_email && (
                <p className="text-[10px] text-text-muted mt-1 truncate">{companyB.reconciliation_email}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── AI Analysis ── */}
        <div className="px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-accent-green/15 border border-accent-green/25 flex items-center justify-center">
              <Zap className="w-3 h-3 text-accent-green" />
            </div>
            <p className="text-[11px] uppercase tracking-widest text-text-muted">AI Analysis</p>
          </div>
          {disc.ai_analysis ? (
            <p className="text-sm text-slate-700 leading-relaxed">{disc.ai_analysis}</p>
          ) : (
            <div className="flex items-center gap-2 text-text-secondary">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                Analysis will be generated by the Gemini agent after running reconciliation (Phase 2).
              </p>
            </div>
          )}
        </div>

        {/* ── Email Draft ── */}
        <div className="px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-accent-blue/15 border border-accent-blue/25 flex items-center justify-center">
              <Mail className="w-3 h-3 text-accent-blue" />
            </div>
            <p className="text-[11px] uppercase tracking-widest text-text-muted">Email Draft</p>
            {disc.email_draft && (
              <span className="ml-auto text-[10px] text-text-muted">
                To: {companyB?.reconciliation_email ?? 'counterparty contact'}
              </span>
            )}
          </div>
          {disc.email_draft ? (
            <div className="bg-surface-primary rounded-xl p-5 border border-surface-border">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {disc.email_draft}
              </pre>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-secondary">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                Email draft will be composed by the Gemini agent (Phase 2).
              </p>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div className="text-xs text-text-muted max-w-xs">
            {isResolved ? (
              <span className="flex items-center gap-1.5 text-accent-green">
                <CheckCircle2 className="w-3.5 h-3.5" /> This discrepancy has been handled.
              </span>
            ) : canApprove ? (
              'Approving will trigger the email send and mark this discrepancy as resolved.'
            ) : (
              `Status: ${disc.status} — no action required.`
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {approveError && (
              <p className="text-red-400 text-xs">{approveError}</p>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={onApprove}
              disabled={!canApprove || isApproving}
              className="px-4 py-2 text-sm font-semibold bg-accent-green hover:bg-accent-green-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
            >
              {isApproving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  Approve &amp; Send
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
