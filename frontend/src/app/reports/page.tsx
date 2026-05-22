'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  BarChart2, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle,
  Clock, Zap, ChevronRight, Loader2, RefreshCw, TrendingUp, Activity, Users,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { getAgentRuns, getCompanies } from '@/lib/api'
import { api } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import * as XLSX from 'xlsx'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Step { type: string; message: string; timestamp: string }

interface AgentRun {
  id: string
  company_a_id: string
  company_b_id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  discrepancies_found: number
  started_at: string
  completed_at: string | null
  steps?: Step[]
}

const STATUS_COLORS = {
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  running:   'bg-blue-100 text-blue-700 border-blue-200',
  failed:    'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
}

const TYPE_HEX: Record<string, string> = {
  amount_mismatch: '#f59e0b',
  missing_record:  '#ef4444',
  date_mismatch:   '#3b82f6',
  duplicate:       '#8b5cf6',
}

const STEP_ICONS: Record<string, string> = {
  loading_companies:      '🏢',
  fetching_ledgers:       '📥',
  comparing_records:      '🔍',
  analyzing_discrepancy:  '🤖',
  discrepancy_saved:      '💾',
  generating_embeddings:  '🧠',
  complete:               '✅',
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  const { data: runs = [], isLoading: runsLoading, refetch } = useQuery<AgentRun[]>({
    queryKey: ['agent-runs'],
    queryFn: () => getAgentRuns(50),
    refetchInterval: 15_000,
  })

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['discrepancy-analytics'],
    queryFn: () => api.get('/api/v1/discrepancies/analytics?days=90').then(r => r.data),
  })

  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['companies'],
    queryFn: () => getCompanies() as Promise<{ id: string; name: string }[]>,
  })

  const { data: allDiscrepancies = [] } = useQuery<{
    id: string; company_b_id: string; discrepancy_type: string;
    status: string; difference: number; detected_at: string
  }[]>({
    queryKey: ['discrepancies'],
    queryFn: () => api.get('/api/v1/discrepancies/').then(r => r.data),
  })

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]))

  // ── Summary Stats ─────────────────────────────────────────────────────────

  const completedRuns: AgentRun[] = runs.filter((r: AgentRun) => r.status === 'completed')
  const totalDiscrepancies: number = runs.reduce((s: number, r: AgentRun) => s + (r.discrepancies_found || 0), 0)
  const avgDuration: number = completedRuns.length
    ? Math.round(completedRuns.reduce((s: number, r: AgentRun) => {
        if (!r.completed_at) return s
        return s + (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000
      }, 0) / completedRuns.length)
    : 0

  // ── Chart Data ────────────────────────────────────────────────────────────

  const trendData = (analytics?.monthly_trend || []).map((d: Record<string, unknown>) => ({
    ...d,
    month: String(d.month || '').slice(0, 7),
  }))

  const typeData = Object.entries(analytics?.type_breakdown || {}).map(([key, val]) => ({
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: val as number,
    fill: TYPE_HEX[key] || '#94a3b8',
  }))

  // Discrepancy stats
  const totalExposure = allDiscrepancies.reduce((s, d) => s + (d.difference || 0), 0)
  const resolvedCount = allDiscrepancies.filter(d => ['resolved', 'email_sent'].includes(d.status)).length
  const resolutionRate = allDiscrepancies.length ? Math.round(resolvedCount / allDiscrepancies.length * 100) : 0

  const statusBreakdown = allDiscrepancies.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1
    return acc
  }, {})
  const statusChartData = Object.entries(statusBreakdown).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
    fill: name === 'resolved' ? '#29BE98' : name === 'email_sent' ? '#3b82f6' : name === 'awaiting_approval' ? '#f59e0b' : '#94a3b8',
  }))

  const topCounterparties = Object.entries(
    allDiscrepancies.reduce<Record<string, { count: number; exposure: number }>>((acc, d) => {
      const key = d.company_b_id
      if (!acc[key]) acc[key] = { count: 0, exposure: 0 }
      acc[key].count++
      acc[key].exposure += d.difference || 0
      return acc
    }, {})
  )
    .map(([id, stats]) => ({ id, name: companyMap[id] || id.slice(-8), ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const runsByDay = (runs as AgentRun[]).reduce<Record<string, number>>((acc: Record<string, number>, r: AgentRun) => {
    const day = r.started_at?.slice(0, 10) || ''
    if (day) acc[day] = (acc[day] || 0) + 1
    return acc
  }, {})
  const activityData = Object.entries(runsByDay).slice(-14).map(([date, count]) => ({
    date: date.slice(5),
    runs: count,
  }))

  // ── Exports ───────────────────────────────────────────────────────────────

  function exportExcel() {
    const wb = XLSX.utils.book_new()

    const runsSheet = runs.map(r => ({
      'Run ID':              r.id,
      'Company A':           companyMap[r.company_a_id] || r.company_a_id,
      'Company B':           companyMap[r.company_b_id] || r.company_b_id,
      'Status':              r.status,
      'Discrepancies Found': r.discrepancies_found,
      'Started At':          r.started_at ? new Date(r.started_at).toLocaleString() : '',
      'Completed At':        r.completed_at ? new Date(r.completed_at).toLocaleString() : '',
      'Duration (s)':        r.completed_at
        ? Math.round((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000)
        : '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(runsSheet), 'Agent Runs')

    if (trendData.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trendData), 'Monthly Trend')
    }

    if (typeData.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        typeData.map(d => ({ 'Type': d.name, 'Count': d.value }))
      ), 'Discrepancy Types')
    }

    XLSX.writeFile(wb, `lumina-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function exportPDF() { window.print() }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 print:hidden">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#29BE98]" />
              Reports & Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Agent run history, discrepancy trends, and performance insights.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors">
              <FileText className="w-3.5 h-3.5" /> Export PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Agent Runs',      value: (runs as AgentRun[]).length,  icon: <Zap className="w-5 h-5 text-[#29BE98]" />,    bg: 'bg-emerald-50 border-emerald-100' },
            { label: 'Discrepancies Found',   value: allDiscrepancies.length,      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50 border-amber-100' },
            { label: 'Resolution Rate',       value: allDiscrepancies.length ? `${resolutionRate}%` : '—', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50 border-emerald-100' },
            { label: 'Total $ Exposure',      value: totalExposure ? `$${totalExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '$0', icon: <TrendingUp className="w-5 h-5 text-red-500" />, bg: 'bg-red-50 border-red-100' },
            { label: 'Completion Rate',       value: (runs as AgentRun[]).length ? `${Math.round(completedRuns.length / (runs as AgentRun[]).length * 100)}%` : '—', icon: <Activity className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 border-blue-100' },
            { label: 'Avg Run Time',          value: avgDuration ? `${avgDuration}s` : '—', icon: <Clock className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50 border-purple-100' },
          ].map(card => (
            <div key={card.label} className={cn('rounded-2xl border p-4', card.bg)}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-medium">{card.label}</span>
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Discrepancy Trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Discrepancy Trend</h2>
                <p className="text-xs text-slate-500">Last 90 days by month</p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            {analyticsLoading ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : trendData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData} barSize={16} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="amount_mismatch" name="Amount Mismatch" fill="#f59e0b" radius={[4,4,0,0]} stackId="a" />
                  <Bar dataKey="missing_record"  name="Missing Record"  fill="#ef4444" radius={[4,4,0,0]} stackId="a" />
                  <Bar dataKey="date_mismatch"   name="Date Mismatch"   fill="#3b82f6" radius={[4,4,0,0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-sm text-slate-400">
                No trend data yet — run a reconciliation to generate data.
              </div>
            )}
          </div>

          {/* Type Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Type Breakdown</h2>
                <p className="text-xs text-slate-500">All time</p>
              </div>
              <BarChart2 className="w-4 h-4 text-slate-400" />
            </div>
            {typeData.length ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                      paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {typeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {typeData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex items-center justify-center text-sm text-slate-400">No data yet</div>
            )}
          </div>
        </div>

        {/* Status Breakdown + Top Counterparties */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Discrepancy Status Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Resolution Status</h2>
                <p className="text-xs text-slate-500">Current discrepancy pipeline</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            </div>
            {statusChartData.length ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={62}
                      paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {statusChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {statusChartData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400">No discrepancies yet</div>
            )}
          </div>

          {/* Top Counterparties */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Top Counterparties by Issues</h2>
                <p className="text-xs text-slate-500">Most discrepancies all time</p>
              </div>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            {topCounterparties.length ? (
              <div className="space-y-3">
                {topCounterparties.map((cp, i) => (
                  <div key={cp.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-slate-500">#{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-900 truncate">{cp.name}</span>
                        <span className="text-xs font-bold text-amber-600 flex-shrink-0 ml-2">{cp.count} issue{cp.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${Math.min((cp.count / topCounterparties[0].count) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        ${cp.exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })} exposure
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400">No data yet</div>
            )}
          </div>
        </div>

        {/* Activity Chart */}
        {activityData.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Agent Activity</h2>
                <p className="text-xs text-slate-500">Reconciliation runs per day (last 14 days)</p>
              </div>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={activityData} barSize={20} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px' }} />
                <Bar dataKey="runs" name="Agent Runs" fill="#29BE98" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Agent Run Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Agent Run Timeline</h2>
              <p className="text-xs text-slate-500">
                Complete history of all reconciliation runs with step-by-step breakdown
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
              {runs.length} runs
            </span>
          </div>

          {runsLoading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : runs.length === 0 ? (
            <div className="p-10 text-center">
              <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No agent runs yet.</p>
              <p className="text-xs text-slate-400 mt-1">Trigger a reconciliation to see the timeline.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(runs as AgentRun[]).map((run: AgentRun) => {
                const isExpanded = expandedRun === run.id
                const duration = run.completed_at
                  ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                  : null
                const compA = companyMap[run.company_a_id] || 'Company A'
                const compB = companyMap[run.company_b_id] || 'Company B'

                return (
                  <div key={run.id}>
                    {/* Run row */}
                    <button
                      onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                    >
                      {/* Status indicator */}
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full flex-shrink-0',
                        run.status === 'completed' && 'bg-emerald-500',
                        run.status === 'running'   && 'bg-blue-500 animate-pulse',
                        run.status === 'failed'    && 'bg-red-500',
                        run.status === 'cancelled' && 'bg-slate-400',
                      )} />

                      {/* Companies + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                          <span className="truncate max-w-[150px]">{compA}</span>
                          <span className="text-slate-400 font-normal">↔</span>
                          <span className="truncate max-w-[150px]">{compB}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                          <span>{formatDate(run.started_at)}</span>
                          {duration !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{duration}s
                            </span>
                          )}
                          {run.steps && (
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />{run.steps.length} steps
                            </span>
                          )}
                          {run.discrepancies_found > 0 && (
                            <span className="text-amber-600 font-semibold">
                              {run.discrepancies_found} discrepanc{run.discrepancies_found === 1 ? 'y' : 'ies'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={cn(
                        'text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize flex-shrink-0',
                        STATUS_COLORS[run.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.cancelled,
                      )}>
                        {run.status}
                      </span>

                      <ChevronRight className={cn(
                        'w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200',
                        isExpanded && 'rotate-90'
                      )} />
                    </button>

                    {/* Steps detail */}
                    {isExpanded && (
                      <div className="px-5 pb-5 bg-slate-50/60">
                        {run.steps && run.steps.length > 0 ? (
                          <div className="ml-5 mt-2 border-l-2 border-slate-200 pl-5 space-y-3">
                            {run.steps.map((step: Step, i: number) => (
                              <div key={i} className="relative">
                                {/* Timeline dot */}
                                <div className={cn(
                                  'absolute -left-[25px] top-1 w-2 h-2 rounded-full border-2 border-white',
                                  i === run.steps!.length - 1 ? 'bg-[#29BE98]' : 'bg-slate-300'
                                )} />
                                <div className="flex items-start gap-2">
                                  <span className="text-sm mt-0.5 flex-shrink-0">
                                    {STEP_ICONS[step.type] || '▶'}
                                  </span>
                                  <div>
                                    <p className="text-xs font-medium text-slate-800">{step.message}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      {new Date(step.timestamp).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 ml-5 mt-3 py-2">
                            No step details available — run was created before step logging was enabled.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          header, nav { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </AppShell>
  )
}