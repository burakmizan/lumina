'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, AlertTriangle, Mail, Zap,
  ChevronRight
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DiscrepancyModal } from '@/components/dashboard/DiscrepancyModal'
import { TypeBadge, StatusBadge } from '@/components/ui/Badge'
import { getCompanies, getDiscrepancies, approveDiscrepancy } from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Company, Discrepancy } from '@/types'

const FILTER_TABS: { label: string; value: string }[] = [
  { label: 'All',               value: 'all' },
  { label: 'Awaiting Approval', value: 'awaiting_approval' },
  { label: 'Email Sent',        value: 'email_sent' },
  { label: 'Resolved',          value: 'resolved' },
]

export default function DashboardPage() {
  const [selected, setSelected]         = useState<Discrepancy | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [approveError, setApproveError] = useState<string | null>(null)
  const qc = useQueryClient()

  const {
    data: companies = [],
    isLoading: loadingCompanies,
  } = useQuery<Company[]>({ queryKey: ['companies'], queryFn: getCompanies })

  const {
    data: allDiscs = [],
    isLoading: loadingDiscs,
    refetch,
    isFetching,
  } = useQuery<Discrepancy[]>({
    queryKey: ['discrepancies'],
    queryFn: () => getDiscrepancies(),
    refetchInterval: 30_000,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDiscrepancy(id),
    onSuccess: (updated: Discrepancy) => {
      qc.invalidateQueries({ queryKey: ['discrepancies'] })
      setSelected(updated)
      setApproveError(null)
    },
    onError: () => {
      setApproveError('Approval failed — check SMTP config or backend logs.')
    },
  })

  const companyMap = companies.reduce<Record<string, Company>>((acc, c) => {
    acc[c.id] = c
    return acc
  }, {})

  const awaitingCount  = allDiscs.filter(d => d.status === 'awaiting_approval').length
  const activeCount    = allDiscs.filter(d => !['resolved', 'email_sent'].includes(d.status)).length
  const isLoading      = loadingCompanies || loadingDiscs

  const filteredDiscs =
    statusFilter === 'all'
      ? allDiscs
      : allDiscs.filter(d => d.status === statusFilter)

  return (
    <AppShell>
      {/* Spacer for global top bar */}
      <div className="h-2" />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Companies Monitored"
          value={isLoading ? '—' : companies.length}
          icon={<Building2 className="w-5 h-5" />}
          color="blue"
          sub={
            isLoading
              ? 'Loading…'
              : companies.length === 0
              ? 'Seed mock data to populate'
              : companies.map(c => c.name).join(' · ')
          }
        />
        <StatCard
          label="Active Discrepancies"
          value={isLoading ? '—' : activeCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="amber"
          sub={activeCount > 0 ? 'Requires reconciliation' : 'All clear'}
        />
        <StatCard
          label="Awaiting Approval"
          value={isLoading ? '—' : awaitingCount}
          icon={<Mail className="w-5 h-5" />}
          color="green"
          sub={
            awaitingCount > 0
              ? `${awaitingCount} email draft${awaitingCount > 1 ? 's' : ''} ready for review`
              : 'No pending approvals'
          }
          highlight={awaitingCount > 0}
        />
      </div>

      {/* ── Discrepancy Feed ── */}
      <div className="bg-surface-secondary border border-surface-border rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-green" />
            <h2 className="text-sm font-semibold text-gray-900">Discrepancy Feed</h2>
            {!isLoading && (
              <span className="text-xs text-text-muted">({filteredDiscs.length})</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  statusFilter === tab.value
                ? 'bg-accent-green/10 text-accent-green border border-accent-green/15'
                : 'text-text-secondary hover:text-gray-900 hover:bg-surface-secondary',
                )}
              >
                {tab.label}
                {tab.value === 'awaiting_approval' && awaitingCount > 0 && (
                  <span className="ml-1.5 bg-accent-green text-white text-[9px] px-1.5 py-px rounded-full font-semibold">
                    {awaitingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-surface-border border-t-accent-green rounded-full animate-spin" />
          </div>
        ) : filteredDiscs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <div className="w-12 h-12 rounded-2xl bg-surface-primary border border-surface-border flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-gray-900 font-medium mb-1">No discrepancies found</p>
            <p className="text-text-muted text-sm">
              {statusFilter !== 'all'
                ? 'Try the "All" filter, or run the reconciliation agent.'
                : 'Run the reconciliation agent or seed mock data to get started.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {filteredDiscs.map(disc => {
              const cA = companyMap[disc.company_a_id]
              const cB = companyMap[disc.company_b_id]
              return (
                <div
                  key={disc.id}
                  onClick={() => { setSelected(disc); setApproveError(null) }}
                  className="flex items-center justify-between px-6 py-4 hover:bg-surface-primary/40 transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-mono font-semibold text-gray-900">
                        {disc.ledger_ref}
                      </span>
                      <TypeBadge type={disc.discrepancy_type} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                      <span className="truncate max-w-[160px]">{cA?.name ?? disc.company_a_id.slice(-8)}</span>
                      <span className="text-text-muted">↔</span>
                      <span className="truncate max-w-[160px]">{cB?.name ?? disc.company_b_id.slice(-8)}</span>
                      {disc.difference != null && (
                        <>
                          <span className="text-text-muted">·</span>
                          <span className="text-red-500 font-medium">
                            {formatCurrency(disc.difference)} diff
                          </span>
                        </>
                      )}
                      <span className="text-text-muted">· {formatDate(disc.detected_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <StatusBadge status={disc.status} />
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Review <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {selected && (
        <DiscrepancyModal
          discrepancy={selected}
          companyMap={companyMap}
          onClose={() => { setSelected(null); setApproveError(null) }}
          onApprove={() => approveMutation.mutate(selected.id)}
          isApproving={approveMutation.isPending}
          approveError={approveError}
        />
      )}
    </AppShell>
  )
}

/* ── Stat Card ─────────────────────────────────────────────────────────────── */

type Color = 'blue' | 'amber' | 'green'

const COLOR_MAP: Record<Color, { icon: string; value: string }> = {
  blue:  { icon: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',       value: 'text-accent-blue' },
  amber: { icon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',             value: 'text-amber-400' },
  green: { icon: 'bg-accent-green/10 text-accent-green border-accent-green/20',    value: 'text-accent-green' },
}

function StatCard({
  label, value, icon, color, sub, highlight,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: Color
  sub?: string
  highlight?: boolean
}) {
  const c = COLOR_MAP[color]
  return (
    <div
      className={cn(
        'bg-surface-secondary border rounded-2xl p-6 transition-all',
        highlight
          ? 'border-accent-green/30 shadow-[0_0_24px_rgba(41,190,152,0.08)]'
          : 'border-surface-border',
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">{label}</p>
        <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', c.icon)}>
          {icon}
        </div>
      </div>
      <p className={cn('text-4xl font-bold mb-1.5 tabular-nums', c.value)}>{value}</p>
      {sub && <p className="text-xs text-text-muted leading-snug line-clamp-2">{sub}</p>}
    </div>
  )
}
