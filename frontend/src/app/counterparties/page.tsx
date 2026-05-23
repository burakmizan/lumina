'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Building2, Mail, Hash, RefreshCw, Zap,
  PlayCircle, CheckCircle2, AlertCircle, Pencil,
  FolderOpen, X, FileSpreadsheet, FileText, Loader2,
  Trash2, Download, Send, Eye, Phone, Upload, FileDown,
  Activity, UserCheck, UserX, GitBranch, Plus,
  LayoutList, Network,
} from 'lucide-react'
import { CounterpartyMap, type MapCompany } from '@/components/counterparties/CounterpartyMap'
import { AppShell } from '@/components/layout/AppShell'
import { Toast } from '@/components/ui/Toast'
import {
  getCompanies,
  getCompanySettings,
  getDiscrepancies,
  startReconciliationSession,
  updateCompany,
  getCounterpartySessions,
  deleteCompany,
  bulkDeleteCompanies,
  downloadSessionFile,
  deleteSessionFile,
  getStatementFiles,
  downloadStorageFile,
  deleteStorageFile,
  importCounterparties,
  downloadCounterpartiesTemplate,
} from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import type { Company, ReconciliationSession, FileRecord, BulkImportResult } from '@/types'

type ToastState = { message: string; variant: 'success' | 'error' } | null

// ── Context Menu ───────────────────────────────────────────────────────────────

interface ContextMenuItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

function ContextMenu({
  x, y, items, onClose,
}: {
  x: number; y: number
  items: ContextMenuItem[]
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: y, left: x })

  useEffect(() => {
    const handleKey   = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e: MouseEvent)    => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown',   handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown',   handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({
      top:  rect.bottom > window.innerHeight ? y - rect.height : y,
      left: rect.right  > window.innerWidth  ? x - rect.width  : x,
    })
  }, [x, y])

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[200px] py-1 bg-[#16293A] border border-white/10 rounded-xl shadow-2xl"
      style={{ top: pos.top, left: pos.left }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); item.onClick(); onClose() }}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left',
            item.variant === 'danger'
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/5',
          )}
        >
          <span className="flex-shrink-0 w-4">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ── Bulk Action Bar ────────────────────────────────────────────────────────────

function BulkActionBar({ count, onDelete, onClear, isDeleting, onSend, isSending }: {
  count: number; onDelete: () => void; onClear: () => void; isDeleting: boolean
  onSend: () => void; isSending: boolean
}) {
  if (count === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-[32px] shadow-2xl">
        <span className="text-sm font-medium text-slate-900">
          <span className="text-[#29BE98] font-bold">{count}</span> selected
        </span>
        <div className="w-px h-5 bg-slate-200" />
        <button
          onClick={onSend}
          disabled={isSending}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-[#29BE98]/10 text-[#29BE98] border border-[#29BE98]/20 rounded-lg hover:bg-[#29BE98]/20 transition-colors disabled:opacity-50"
        >
          {isSending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />}
          Send Selected
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {isDeleting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />}
          Delete Selected
        </button>
        <button onClick={onClear} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
    </div>
  )
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────

function DeleteConfirmModal({ title, description, onConfirm, onClose, isDeleting }: {
  title: string; description: string; onConfirm: () => void; onClose: () => void; isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[420px] shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Delete Permanently
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Profile Modal ──────────────────────────────────────────────────────────────

function ProfileModal({ company, onClose, onEdit, onDocs, onSend }: {
  company: Company; onClose: () => void
  onEdit: () => void; onDocs: () => void; onSend: () => void
}) {
  const isActive = company.status === 'active'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[540px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#2597F8]/10 border border-[#2597F8]/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-[#2597F8]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">{company.name}</h2>
              <span className={cn(
                'inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border mt-0.5',
                isActive ? 'bg-[#29BE98]/10 text-[#29BE98] border-[#29BE98]/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20',
              )}>
                {isActive && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#29BE98] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#29BE98]" /></span>}
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Master Data Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Tax ID / EIN', value: company.tax_id, mono: true },
              { label: 'Customer Code', value: company.customer_code || '—', mono: !!company.customer_code },
              { label: 'Primary Email', value: company.reconciliation_email, mono: false },
              { label: 'Contact Name', value: company.contact_name, mono: false },
            ].map(({ label, value, mono }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</p>
                <p className={cn('text-sm text-slate-900 truncate', mono && 'font-mono')}>{value}</p>
              </div>
            ))}
          </div>

          {/* Phone Numbers Array */}
          {company.phones && company.phones.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-3.5 h-3.5 text-[#29BE98]" />
                <p className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">Phone Numbers ({company.phones.length})</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {company.phones.map((phone, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono">
                    <Phone className="w-3 h-3 text-[#29BE98]" />
                    {phone}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Email Addresses Array */}
          {company.emails && company.emails.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-3.5 h-3.5 text-[#2597F8]" />
                <p className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">Email Addresses ({company.emails.length})</p>
              </div>
              <div className="flex flex-col gap-1.5">
                {company.emails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <Mail className="w-3 h-3 text-[#2597F8] flex-shrink-0" />
                    <span className="text-sm text-slate-900 truncate">{email}</span>
                    {idx === 0 && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-[#2597F8]/10 text-[#2597F8] border border-[#2597F8]/20 rounded font-medium flex-shrink-0">Primary</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Created {formatDate(company.created_at)}</span>
            <span>·</span>
            <span>Updated {formatDate(company.updated_at)}</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-5 flex items-center gap-2">
          <button onClick={() => { onEdit(); onClose() }} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors">
            <Pencil className="w-3.5 h-3.5" />Edit
          </button>
          <button onClick={() => { onDocs(); onClose() }} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors">
            <FolderOpen className="w-3.5 h-3.5" />Docs
          </button>
          <button onClick={() => { onSend(); onClose() }} disabled={!isActive} className={cn(
            'ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors',
            isActive ? 'bg-[#29BE98] hover:bg-[#29BE98]/90 text-white' : 'bg-white/5 text-[#64748B] cursor-not-allowed',
          )}>
            <Send className="w-3.5 h-3.5" />Send Magic Link
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────

interface EditForm {
  name: string
  reconciliation_email: string
  contact_name: string
  phones: string[]
  emails: string[]
}

function EditModal({ company, onClose, onSaved }: { company: Company; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient()

  const [form, setForm] = useState<EditForm>({
    name:                 company.name,
    reconciliation_email: company.reconciliation_email,
    contact_name:         company.contact_name,
    phones: company.phones?.length ? [...company.phones] : [''],
    emails: company.emails?.length ? [...company.emails] : [''],
  })

  const mutation = useMutation({
    mutationFn: () => updateCompany(company.id, {
      ...form,
      phones: form.phones.filter(p => p.trim()),
      emails: form.emails.filter(e => e.trim()),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); onSaved() },
  })

  const setPhone  = (i: number, v: string) => setForm(f => { const a = [...f.phones]; a[i] = v; return { ...f, phones: a } })
  const delPhone  = (i: number)            => setForm(f => ({ ...f, phones: f.phones.filter((_, x) => x !== i) }))
  const addPhone  = ()                     => setForm(f => ({ ...f, phones: [...f.phones, ''] }))
  const setEmail  = (i: number, v: string) => setForm(f => { const a = [...f.emails]; a[i] = v; return { ...f, emails: a } })
  const delEmail  = (i: number)            => setForm(f => ({ ...f, emails: f.emails.filter((_, x) => x !== i) }))
  const addEmail  = ()                     => setForm(f => ({ ...f, emails: [...f.emails, ''] }))

  const LABEL = 'block text-[11px] uppercase tracking-widest text-slate-500 mb-1.5'
  const INPUT = 'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#2597F8]/50 placeholder:text-slate-400 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[620px] shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-[#2597F8]" />
            <h2 className="text-sm font-semibold text-slate-900">Edit Counterparty</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">

          {/* Basic fields — 2 col grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL}>Company Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={INPUT} placeholder="Legal company name" />
            </div>
            <div>
              <label className={LABEL}>Accounting Email</label>
              <input value={form.reconciliation_email} onChange={e => setForm(f => ({ ...f, reconciliation_email: e.target.value }))} className={INPUT} placeholder="accounting@company.com" />
            </div>
            <div>
              <label className={LABEL}>Contact Name</label>
              <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className={INPUT} placeholder="Full name" />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Tax ID / EIN / VAT Number</label>
              <input value={company.tax_id} readOnly className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed" />
              <p className="text-[10px] text-slate-400 mt-1">Tax ID cannot be changed after creation.</p>
            </div>
          </div>

          {/* Phone Numbers */}
          <div>
            <label className={LABEL}>Phone Numbers</label>
            <div className="flex flex-wrap gap-2">
              {form.phones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-1.5 min-w-[200px] flex-1">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      value={phone}
                      onChange={e => setPhone(idx, e.target.value)}
                      placeholder="+1-555-000-0000"
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#2597F8]/50 placeholder:text-slate-400 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => delPhone(idx)}
                    title="Remove"
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addPhone} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#2597F8] hover:opacity-75 transition-opacity">
              <Plus className="w-3.5 h-3.5" /> Add Phone Number
            </button>
          </div>

          {/* Email Addresses */}
          <div>
            <label className={LABEL}>Email Addresses</label>
            <div className="flex flex-wrap gap-2">
              {form.emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-1.5 min-w-[240px] flex-1">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      value={email}
                      onChange={e => setEmail(idx, e.target.value)}
                      placeholder="email@company.com"
                      className="w-full pl-8 pr-16 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#2597F8]/50 placeholder:text-slate-400 transition-colors"
                    />
                    {idx === 0 && (
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-[#2597F8]/10 text-[#2597F8] border border-[#2597F8]/20 rounded font-medium pointer-events-none">
                        Primary
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => delEmail(idx)}
                    disabled={idx === 0 && form.emails.length === 1}
                    title="Remove"
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addEmail} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#2597F8] hover:opacity-75 transition-opacity">
              <Plus className="w-3.5 h-3.5" /> Add Email Address
            </button>
          </div>

        </div>

        {mutation.isError && (
          <p className="px-6 pb-1 text-xs text-red-400 flex-shrink-0">Failed to save changes. Please try again.</p>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name.trim()}
            className="px-4 py-2 text-sm font-semibold bg-[#2597F8] hover:bg-[#2597F8]/90 disabled:opacity-40 text-white rounded-xl transition-colors flex items-center gap-2"
          >
            {mutation.isPending
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
              : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Import Modal ───────────────────────────────────────────────────────────────

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: (r: BulkImportResult) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: importCounterparties,
    onSuccess: (data: BulkImportResult) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['companies'] })
    },
  })

  const handleFile = useCallback((f: File) => {
    const ext = f.name.toLowerCase().split('.').pop()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) return
    setFile(f)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#16293A] border border-white/10 rounded-2xl w-full max-w-[520px] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#29BE98]" />
            <h2 className="text-sm font-semibold text-white">Import Counterparties (Excel)</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCounterpartiesTemplate()}
              title="Download sample template"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#29BE98] border border-[#29BE98]/20 rounded-lg hover:bg-[#29BE98]/10 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Sample Template
            </button>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              {/* Expected columns */}
              <div className="bg-[#0C1F30] rounded-xl border border-white/5 p-4 space-y-2">
                <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Expected columns (any order)</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Company Name', 'Tax ID / VAT Number', 'Customer Code', 'Contact Name', 'Status', 'Phone1', 'Phone2', 'Mail1', 'Mail2'].map(col => (
                    <span key={col} className="px-2 py-0.5 text-[11px] bg-white/5 border border-white/10 rounded text-[#94A3B8]">{col}</span>
                  ))}
                </div>
                <p className="text-[10px] text-[#64748B]">Phone1, Phone2… and Mail1, Mail2… columns are stored as structured arrays in MongoDB.</p>
              </div>

              {/* Dropzone */}
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors',
                  isDragging ? 'border-[#29BE98] bg-[#29BE98]/5' : 'border-white/15 hover:border-[#29BE98]/40 hover:bg-white/2',
                )}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                {file ? (
                  <>
                    <FileSpreadsheet className="w-8 h-8 text-[#29BE98]" />
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-[#94A3B8]">{(file.size / 1024).toFixed(1)} KB — click to replace</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-[#64748B]" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">Drop file here or click to browse</p>
                      <p className="text-xs text-[#94A3B8] mt-1">.xlsx · .xls · .csv</p>
                    </div>
                  </>
                )}
              </div>

              {mutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">Import failed. Please check the file format and try again.</p>
                </div>
              )}

              <button
                disabled={!file || mutation.isPending}
                onClick={() => file && mutation.mutate(file)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  file && !mutation.isPending
                    ? 'bg-[#29BE98] text-white hover:bg-[#29BE98]/90'
                    : 'bg-white/5 text-[#64748B] cursor-not-allowed',
                )}
              >
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</> : <><Upload className="w-4 h-4" />Import Counterparties</>}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-[#29BE98]/10 border border-[#29BE98]/20 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-[#29BE98] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Import complete</p>
                  <p className="text-xs text-[#29BE98]">{result.created + result.updated} records processed</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Created', value: result.created, color: 'text-[#29BE98]' },
                  { label: 'Updated', value: result.updated, color: 'text-[#2597F8]' },
                  { label: 'Skipped', value: result.skipped, color: 'text-amber-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#0C1F30] rounded-xl p-3 text-center border border-white/5">
                    <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {result.errors.length > 0 && (
                <div className="bg-[#0C1F30] rounded-xl border border-white/5 p-3 max-h-28 overflow-y-auto">
                  <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest mb-2">Warnings</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-[11px] text-[#94A3B8] leading-relaxed">{e}</p>
                  ))}
                </div>
              )}
              <button onClick={() => { onDone(result); onClose() }} className="w-full py-2.5 rounded-xl bg-[#29BE98] text-white text-sm font-semibold hover:bg-[#29BE98]/90 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Docs Modal ─────────────────────────────────────────────────────────────────

const SESSION_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending_upload: { label: 'Pending Upload', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  processing:     { label: 'Processing',     cls: 'bg-[#2597F8]/10 text-[#2597F8] border-[#2597F8]/20' },
  completed:      { label: 'Completed',      cls: 'bg-[#29BE98]/10 text-[#29BE98] border-[#29BE98]/20' },
  expired:        { label: 'Expired',        cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

function DocsModal({ company, onClose }: { company: Company; onClose: () => void }) {
  const qc = useQueryClient()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [dlError,       setDlError]       = useState<string | null>(null)
  const [activeTab,     setActiveTab]     = useState<'sessions' | 'statements'>('sessions')

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<ReconciliationSession[]>({
    queryKey: ['sessions', company.id],
    queryFn: () => getCounterpartySessions(company.id),
  })
  const { data: stmtFiles = [], isLoading: stmtLoading } = useQuery<FileRecord[]>({
    queryKey: ['statement-files', company.id],
    queryFn: () => getStatementFiles(company.id),
  })

  const deleteSessFileMutation = useMutation({
    mutationFn: (sessionId: string) => deleteSessionFile(sessionId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions', company.id] }); setDeletingId(null) },
    onError:   () => { setDeletingId(null) },
  })
  const deleteStmtFileMutation = useMutation({
    mutationFn: (storageId: string) => deleteStorageFile(storageId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['statement-files', company.id] }); setDeletingId(null) },
    onError:   () => { setDeletingId(null) },
  })

  async function handleDownloadSession(session: ReconciliationSession) {
    if (!session.storage_id) return
    setDownloadingId(session.id); setDlError(null)
    try { await downloadSessionFile(session.id, session.filename ?? 'download') }
    catch { setDlError('Download failed.') }
    finally { setDownloadingId(null) }
  }

  async function handleDownloadStmt(file: FileRecord) {
    setDownloadingId(file.id); setDlError(null)
    try { await downloadStorageFile(file.id, file.filename) }
    catch { setDlError('Download failed.') }
    finally { setDownloadingId(null) }
  }

  const isLoading = activeTab === 'sessions' ? sessionsLoading : stmtLoading
  const isEmpty   = activeTab === 'sessions' ? sessions.length === 0 : stmtFiles.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[560px] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="w-4 h-4 text-[#2597F8] flex-shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">Documents</h2>
            <span className="text-xs text-slate-500 truncate">— {company.name}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex border-b border-slate-200 px-6">
          {([
            { key: 'sessions',   label: 'Portal Uploads',     count: sessions.length },
            { key: 'statements', label: 'Internal Statements', count: stmtFiles.length },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn(
              'flex items-center gap-2 px-1 py-3 text-xs font-medium border-b-2 mr-6 transition-colors',
              activeTab === tab.key ? 'border-[#29BE98] text-[#29BE98]' : 'border-transparent text-slate-500 hover:text-slate-900',
            )}>
              {tab.label}
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="px-6 py-4 max-h-[380px] overflow-y-auto">
          {dlError && (
            <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{dlError}</p>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-[#2597F8] animate-spin" /></div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                <FolderOpen className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">No documents yet</p>
              <p className="text-xs text-slate-500">
                {activeTab === 'sessions' ? 'Send a reconciliation invite to request a ledger upload.' : 'Upload an internal statement via the Reconciliation List.'}
              </p>
            </div>
          ) : activeTab === 'sessions' ? (
            <div className="space-y-2">
              {sessions.map(session => {
                const ext = session.filename?.split('.').pop()?.toLowerCase()
                const isPdf = ext === 'pdf'
                const statusCfg = SESSION_STATUS_CONFIG[session.status] ?? SESSION_STATUS_CONFIG.pending_upload
                const isDl = downloadingId === session.id
                const isDel = deletingId === session.id
                return (
                  <div key={session.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      {isPdf ? <FileText className="w-4 h-4 text-red-400" /> : <FileSpreadsheet className="w-4 h-4 text-[#29BE98]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{session.filename ?? 'Ledger upload'}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        {session.uploaded_at && <span>{formatDate(session.uploaded_at)}</span>}
                        {session.parsed_ledger_count > 0 && <><span>·</span><span className="text-[#29BE98]">{session.parsed_ledger_count} records</span></>}
                        <span>·</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', statusCfg.cls)}>{statusCfg.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {session.storage_id && (
                        <>
                          <button onClick={() => handleDownloadSession(session)} disabled={isDl} title="Download file" className="p-1.5 rounded-lg text-[#2597F8] hover:bg-[#2597F8]/10 transition-colors disabled:opacity-40">
                            {isDl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => { setDeletingId(session.id); deleteSessFileMutation.mutate(session.id) }} disabled={isDel} title="Delete file" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {isDel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {stmtFiles.map(file => {
                const isDl  = downloadingId === file.id
                const isDel = deletingId === file.id
                return (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-[#0C1F30] rounded-xl border border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-[#16293A] border border-white/10 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-4 h-4 text-[#29BE98]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{file.filename}</p>
                      <div className="flex items-center gap-2 text-xs text-[#94A3B8] mt-0.5">
                        <span>{formatDate(file.created_at)}</span>
                        <span>·</span>
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                        <span>·</span>
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded border font-medium',
                          file.source?.startsWith('portal')
                            ? 'bg-[#2597F8]/10 text-[#2597F8] border-[#2597F8]/20'
                            : 'bg-[#29BE98]/10 text-[#29BE98] border-[#29BE98]/20',
                        )}>
                          {file.source?.startsWith('portal') ? '↑ Counterparty' : 'Internal'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleDownloadStmt(file)} disabled={isDl} title="Download file" className="p-1.5 rounded-lg text-[#2597F8] hover:bg-[#2597F8]/10 transition-colors disabled:opacity-40">
                        {isDl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => { setDeletingId(file.id); deleteStmtFileMutation.mutate(file.id) }} disabled={isDel} title="Delete file" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                        {isDel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 pt-1">
          <p className="text-[11px] text-[#64748B] text-center">Showing all documents for {company.name}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CounterpartiesPage() {
  const [toast, setToast]             = useState<ToastState>(null)
  const [startingId, setStartingId]   = useState<string | null>(null)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [docsCompany, setDocsCompany] = useState<Company | null>(null)
  const [profileCompany, setProfileCompany] = useState<Company | null>(null)
  const [showImport,    setShowImport]      = useState(false)
  const [view,          setView]            = useState<'list' | 'map'>('list')

  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)

  const [ctxMenu, setCtxMenu] = useState<{
    visible: boolean; x: number; y: number; company: Company | null
  }>({ visible: false, x: 0, y: 0, company: null })

  const qc = useQueryClient()

  // Keyboard shortcut: Cmd+N → open import modal
  useEffect(() => {
    const handler = () => setShowImport(true)
    window.addEventListener('lumina:kb:new_counterparty', handler)
    return () => window.removeEventListener('lumina:kb:new_counterparty', handler)
  }, [])

  const { data: companies = [], isLoading, refetch, isFetching } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: getCompanies,
  })

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: getCompanySettings,
    retry: false,
  })

  const { data: allDiscs = [] } = useQuery({
    queryKey: ['discrepancies'],
    queryFn: () => getDiscrepancies(),
    staleTime: 30_000,
  })

  const discrepancyIds = new Set(
    (allDiscs as { company_b_id: string; status: string }[])
      .filter(d => d.status !== 'resolved')
      .map(d => d.company_b_id)
  )

  const ownCompany     = companies.find(c => c.is_own_company) ?? companies[0]
  const counterparties = companies.filter(c => c.id !== ownCompany?.id)

  useEffect(() => {
    setSelected(prev => {
      const ids = new Set(counterparties.map(c => c.id))
      return new Set(Array.from(prev).filter(id => ids.has(id)))
    })
  }, [counterparties.length])

  const stats = {
    total:    counterparties.length,
    active:   counterparties.filter(c => c.status === 'active').length,
    inactive: counterparties.filter(c => c.status === 'inactive').length,
    withData: counterparties.filter(c => c.phones.length > 0 || c.emails.length > 0).length,
  }

  const allSelected = counterparties.length > 0 && counterparties.every(c => selected.has(c.id))
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(counterparties.map(c => c.id)))
  const toggleOne   = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const startMutation = useMutation({
    mutationFn: ({ initiating, counterparty }: { initiating: string; counterparty: string }) =>
      startReconciliationSession(initiating, counterparty),
    onSuccess: (session, vars) => {
      const cp = companies.find(c => c.id === vars.counterparty)
      setToast({ variant: 'success', message: `Invite sent to ${cp?.name ?? 'counterparty'}. Token: …${session.token.slice(-8)}` })
      setStartingId(null)
    },
    onError: (err: Error) => {
      setToast({ variant: 'error', message: err.message || 'Failed to start reconciliation.' })
      setStartingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      setDeleteTarget(null)
      setToast({ variant: 'success', message: 'Counterparty and all associated data deleted.' })
    },
    onError: () => setToast({ variant: 'error', message: 'Failed to delete counterparty.' }),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteCompanies(ids),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      setSelected(new Set())
      setToast({ variant: 'success', message: data.message ?? `${data.deleted} counterpart${data.deleted === 1 ? 'y' : 'ies'} deleted.` })
    },
    onError: () => setToast({ variant: 'error', message: 'Bulk delete failed.' }),
  })

  function handleStart(counterpartyId: string) {
    if (!ownCompany) { setToast({ variant: 'error', message: 'Your company is not configured yet.' }); return }
    setStartingId(counterpartyId)
    startMutation.mutate({ initiating: ownCompany.id, counterparty: counterpartyId })
  }

  const [isBulkSending, setIsBulkSending] = useState(false)

  async function handleBulkSend() {
    if (!ownCompany) { setToast({ variant: 'error', message: 'Your company is not configured yet.' }); return }
    setIsBulkSending(true)
    let sent = 0
    for (const id of Array.from(selected)) {
      try {
        await startReconciliationSession(ownCompany.id, id)
        sent++
      } catch { /* skip failed */ }
    }
    setIsBulkSending(false)
    setSelected(new Set())
    setToast({ variant: 'success', message: `${sent} invitation${sent !== 1 ? 's' : ''} sent.` })
  }

  function handleContextMenu(e: React.MouseEvent, company: Company) {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, company })
  }

  function handleRowClick(company: Company) {
    setProfileCompany(company)
  }

  function contextMenuItems(company: Company): ContextMenuItem[] {
    return [
      { icon: <Eye className="w-3.5 h-3.5" />,      label: 'View Profile',       onClick: () => setProfileCompany(company) },
      { icon: <Send className="w-3.5 h-3.5" />,     label: 'Send Magic Link',    onClick: () => handleStart(company.id) },
      { icon: <FolderOpen className="w-3.5 h-3.5" />, label: 'View Docs',        onClick: () => setDocsCompany(company) },
      { icon: <Pencil className="w-3.5 h-3.5" />,   label: 'Edit Details',       onClick: () => setEditCompany(company) },
      { icon: <Trash2 className="w-3.5 h-3.5" />,   label: 'Delete Counterparty', onClick: () => setDeleteTarget(company), variant: 'danger' },
    ]
  }

  return (
    <AppShell>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Counterparties</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage counterparty accounts and initiate reconciliation workflows.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => downloadCounterpartiesTemplate()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm hover:text-slate-900 hover:border-slate-300 transition-colors"
            title="Download Excel template"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Sample Template</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#29BE98]/10 border border-[#29BE98]/25 text-[#29BE98] text-sm font-semibold hover:bg-[#29BE98]/20 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Counterparties
          </button>
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <LayoutList className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setView('map')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Network className="w-3.5 h-3.5" /> Map
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Map View ── */}
      {view === 'map' && (
        <div className="mb-6">
          <CounterpartyMap
            companies={[
              // Own company comes from companySettings, NOT from companies array
              // DEMO - MVP: inject own company if not already in companies list
              ...(!companies.some(c => c.is_own_company) && companySettings?.identity?.company_name
                ? [{
                    id:      'own-company-settings',
                    name:    companySettings.identity.company_name as string,
                    isOwn:   true,
                    status:  'matched' as const,
                    country: (companySettings.identity as { legal_country?: string }).legal_country
                             || 'United States', // DEMO - MVP fallback
                  }]
                : []),
              // Counterparties
              ...companies.map(c => {
                const isOwn = c.is_own_company
                  || c.name === companySettings?.identity?.company_name
                  || c.id === ownCompany?.id
                let status: MapCompany['status'] = 'pending'
                if (!isOwn && discrepancyIds.has(c.id)) status = 'discrepancy'
                else if (!isOwn && c.status === 'active') status = 'matched'
                return {
                  id: c.id, name: c.name, isOwn, status,
                  // DEMO - MVP: legal_country not in DB yet
                  country: (c as { legal_country?: string }).legal_country
                    || (isOwn
                      ? (companySettings?.identity as { legal_country?: string })?.legal_country
                      : undefined)
                    || 'United States', // DEMO - MVP fallback
                }
              }),
            ]}
            onNodeClick={id => {
              const found = companies.find(c => c.id === id)
              if (found && !found.is_own_company) setProfileCompany(found)
            }}
          />
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6', view === 'map' && 'hidden')}>
        {[
          { label: 'Total',           value: stats.total,    color: 'text-slate-900',   icon: <Users className="w-4 h-4" />,      bg: 'bg-white border-slate-200' },
          { label: 'Active',          value: stats.active,   color: 'text-[#29BE98]',   icon: <UserCheck className="w-4 h-4" />,  bg: 'bg-[#29BE98]/10 border-[#29BE98]/20' },
          { label: 'Inactive',        value: stats.inactive, color: 'text-amber-600',   icon: <UserX className="w-4 h-4" />,      bg: 'bg-amber-50 border-amber-200' },
          { label: 'With ERP Data',   value: stats.withData, color: 'text-[#2597F8]',   icon: <GitBranch className="w-4 h-4" />,  bg: 'bg-[#2597F8]/10 border-[#2597F8]/20' },
        ].map(({ label, value, color, icon, bg }) => (
          <div key={label} className={cn('rounded-2xl border p-4', bg)}>
            <div className="flex items-center justify-between mb-1">
              <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
              <span className={cn('opacity-60', color)}>{icon}</span>
            </div>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Own company card ── */}
      {companySettings && (
        <div className="mb-4 p-4 bg-white border border-[#29BE98]/20 rounded-2xl flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#29BE98]/10 border border-[#29BE98]/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4.5 h-4.5 text-[#29BE98]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-[#29BE98] mb-0.5">Your Company</p>
            <p className="text-sm font-semibold text-slate-900">{companySettings.identity?.company_name}</p>
            <p className="text-xs text-slate-500">
              {companySettings.identity?.identifier_type}: {companySettings.identity?.identifier_value}
              {companySettings.contact?.contact_email && ` · ${companySettings.contact.contact_email}`}
            </p>
          </div>
          <span className="text-[10px] px-2 py-1 bg-[#29BE98]/10 text-[#29BE98] border border-[#29BE98]/20 rounded-lg font-medium flex-shrink-0">Initiator</span>
        </div>
      )}

      {/* ── Counterparties table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2597F8]" />
            <h2 className="text-sm font-semibold text-slate-900">Counterparty Accounts</h2>
            {!isLoading && <span className="text-xs text-slate-500">({counterparties.length})</span>}
          </div>
          {selected.size > 0 && (
            <span className="text-xs text-slate-500">
              <span className="text-[#29BE98] font-semibold">{selected.size}</span> of {counterparties.length} selected
            </span>
          )}
        </div>

        {/* Column headers */}
        <div
          className="hidden md:grid text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 border-b border-slate-200 bg-slate-50"
          style={{ gridTemplateColumns: '40px 1fr 130px 180px 80px 100px 220px' }}
        >
          <div className="flex items-center">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 bg-white accent-[#29BE98] cursor-pointer" />
          </div>
          {['Company Name', 'Tax ID', 'Email', 'Code', 'Status', 'Action'].map(h => (
            <span key={h}>{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : counterparties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8 select-none">
            {/* Animated icon stack */}
            <div className="relative mb-7">
              {/* Pulse bg */}
              <div className="absolute inset-[-10px] rounded-[24px] bg-[#29BE98]/8 animate-pulse" style={{ animationDuration: '2.5s' }} />
              {/* Main icon */}
              <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(41,190,152,0.12), rgba(37,151,248,0.08))', border: '1px solid rgba(41,190,152,0.2)' }}>
                <Building2 className="w-10 h-10 text-[#29BE98] animate-bounce" style={{ animationDuration: '2.8s' }} />
              </div>
              {/* Floating badge — users */}
              <div className="absolute -top-3 -right-3 w-9 h-9 rounded-xl flex items-center justify-center shadow-md animate-bounce"
                style={{ background: 'rgba(37,151,248,0.12)', border: '1px solid rgba(37,151,248,0.2)', animationDuration: '2.2s', animationDelay: '0.4s' }}>
                <Users className="w-4 h-4 text-[#2597F8]" />
              </div>
              {/* Floating badge — mail */}
              <div className="absolute -bottom-2 -left-3 w-8 h-8 rounded-xl flex items-center justify-center shadow-md animate-bounce"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', animationDuration: '2s', animationDelay: '0.8s' }}>
                <Mail className="w-3.5 h-3.5 text-amber-500" />
              </div>
              {/* Floating badge — zap */}
              <div className="absolute top-0 -left-4 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm animate-bounce"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', animationDuration: '3s', animationDelay: '1.2s' }}>
                <Zap className="w-3 h-3 text-purple-500" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">No counterparties yet</h3>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-7">
              Import your first counterparty to start the AI-powered B2B reconciliation workflow — discrepancies detected in seconds.
            </p>

            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2.5 px-7 py-3 text-sm font-bold text-white rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #29BE98, #22a085)', boxShadow: '0 4px 20px rgba(41,190,152,0.3)' }}
            >
              <Upload className="w-4 h-4" />
              Import Counterparties
            </button>

            <p className="text-xs text-slate-400 mt-4">
              or run{' '}
              <code className="text-[#29BE98] bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px] font-mono">
                scripts/seed_mock_data.py
              </code>
              {' '}for demo data
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {counterparties.map(company => {
              const isBusy    = startingId === company.id
              const isActive  = company.status === 'active'
              const isChecked = selected.has(company.id)

              return (
                <div
                  key={company.id}
                  onContextMenu={e => handleContextMenu(e, company)}
                  onClick={() => handleRowClick(company)}
                  className={cn(
                    'grid grid-cols-1 gap-3 md:gap-4 items-center px-5 py-3.5 transition-colors cursor-pointer select-none',
                    isChecked ? 'bg-[#2597F8]/5' : 'hover:bg-slate-50',
                  )}
                  style={{ gridTemplateColumns: '40px 1fr 130px 180px 80px 100px 220px' }}
                >
                  {/* Checkbox */}
                  <div className="flex items-center" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleOne(company.id)} className="w-4 h-4 rounded border-slate-300 bg-white accent-[#29BE98] cursor-pointer" />
                  </div>

                  {/* Company name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#2597F8]/10 border border-[#2597F8]/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-[#2597F8]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
                      <p className="text-xs text-slate-500 truncate">{company.contact_name}</p>
                    </div>
                  </div>

                  {/* Tax ID */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Hash className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="font-mono truncate">{company.tax_id}</span>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                    <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{company.reconciliation_email}</span>
                  </div>

                  {/* Customer code */}
                  <span className="text-xs text-slate-500 truncate font-mono">{company.customer_code || '—'}</span>

                  {/* Status */}
                  <div>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border',
                      isActive
                        ? 'bg-[#29BE98]/10 text-[#29BE98] border-[#29BE98]/20'
                        : 'bg-slate-100 text-slate-500 border-slate-200',
                    )}>
                      {isActive && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#29BE98] opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#29BE98]" />
                        </span>
                      )}
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Row actions */}
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={e => { e.stopPropagation(); setDocsCompany(company) }}
                      title="View documents"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#2597F8] hover:bg-[#2597F8]/10 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setEditCompany(company) }}
                      title="Edit counterparty"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#2597F8] hover:bg-[#2597F8]/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(company) }}
                      title="Delete counterparty"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleStart(company.id) }}
                      disabled={isBusy || !isActive}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border whitespace-nowrap',
                        isActive && !isBusy
                          ? 'bg-[#29BE98] text-white border-transparent hover:bg-[#29BE98]/90 shadow-sm'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60',
                      )}
                    >
                      {isBusy
                        ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                        : <><PlayCircle className="w-3.5 h-3.5" />Send</>
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Workflow legend */}
      <div className="flex items-center gap-6 px-1 mt-4 text-[11px] text-slate-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#29BE98]" />Active — ready for reconciliation</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" />Inactive — paused</span>
        <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-slate-400" />Click any row to view full profile</span>
      </div>

      {/* ── Bulk Action Bar ── */}
      <BulkActionBar
        count={selected.size}
        onDelete={() => bulkDeleteMutation.mutate(Array.from(selected))}
        onClear={() => setSelected(new Set())}
        isDeleting={bulkDeleteMutation.isPending}
        onSend={handleBulkSend}
        isSending={isBulkSending}
      />

      {/* ── Context Menu ── */}
      {ctxMenu.visible && ctxMenu.company && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={contextMenuItems(ctxMenu.company)}
          onClose={() => setCtxMenu(p => ({ ...p, visible: false }))}
        />
      )}

      {/* ── Modals ── */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={result => setToast({ variant: 'success', message: `Import complete: ${result.created} created, ${result.updated} updated.` })}
        />
      )}
      {profileCompany && (
        <ProfileModal
          company={profileCompany}
          onClose={() => setProfileCompany(null)}
          onEdit={() => setEditCompany(profileCompany)}
          onDocs={() => setDocsCompany(profileCompany)}
          onSend={() => handleStart(profileCompany.id)}
        />
      )}
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
      {docsCompany && <DocsModal company={docsCompany} onClose={() => setDocsCompany(null)} />}
      {deleteTarget && (
        <DeleteConfirmModal
          title={`Delete ${deleteTarget.name}?`}
          description="This will permanently delete the counterparty and all associated ledgers, sessions, and files. This action cannot be undone."
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </AppShell>
  )
}
