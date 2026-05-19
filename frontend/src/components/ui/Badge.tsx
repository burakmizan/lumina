import { cn } from '@/lib/utils'
import type { DiscrepancyType, DiscrepancyStatus } from '@/types'

const TYPE_CONFIG: Record<DiscrepancyType, { label: string; cls: string }> = {
  amount_mismatch: { label: 'Amount Mismatch', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  missing_record:  { label: 'Missing Record',  cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  date_mismatch:   { label: 'Date Mismatch',   cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  duplicate:       { label: 'Duplicate',        cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
}

const STATUS_CONFIG: Record<DiscrepancyStatus, { label: string; cls: string; pulse?: boolean }> = {
  detected:          { label: 'Detected',          cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  awaiting_approval: { label: 'Awaiting Approval', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', pulse: true },
  email_sent:        { label: 'Email Sent',         cls: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' },
  resolved:          { label: 'Resolved',           cls: 'bg-accent-green/10 text-accent-green border-accent-green/20' },
  disputed:          { label: 'Disputed',           cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export function TypeBadge({ type }: { type: DiscrepancyType }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.amount_mismatch
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: DiscrepancyStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.detected
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border', cfg.cls)}>
      {cfg.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-400" />
        </span>
      )}
      {cfg.label}
    </span>
  )
}
