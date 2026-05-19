'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, ChevronRight, FileUp, Eye, Mail, ExternalLink,
  Trash2, Download, FolderOpen, FileText, MoreHorizontal,
  Archive, Users, FileDown,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  getMasterBalances,
  importMasterBalances,
  importStatementOfAccount,
  uploadInternalStatement,
  getStatementEntries,
  getStatementFiles,
  sendMagicLinkFromReconciliation,
  deleteMasterBalance,
  bulkDeleteMasterBalances,
  getGlobalStatements,
  deleteGlobalStatement,
  downloadGlobalStatement,
  downloadStorageFile,
  deleteStorageFile,
  downloadMasterBalancesTemplate,
  downloadStatementOfAccountTemplate,
  downloadInternalStatementTemplate,
} from '@/lib/api'
import type {
  MasterBalance,
  MasterBalanceStatus,
  ImportMasterResult,
  ImportStatementOfAccountResult,
  StatementEntry,
  SendMagicLinkResult,
  FileRecord,
  GlobalStatementRecord,
  DeleteResponse,
} from '@/types'
import { formatCurrency, cn } from '@/lib/utils'

// ── Error extractor ───────────────────────────────────────────────────────────

function extractError(err: unknown): string {
  if (!err) return ''
  const ax = err as { response?: { data?: { detail?: unknown } }; message?: string }
  const detail = ax?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return (detail as { msg?: string }[]).map(d => d.msg ?? String(d)).join('. ')
  return (err as Error).message || 'An unexpected error occurred.'
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MasterBalanceStatus }) {
  const map: Record<MasterBalanceStatus, { label: string; cls: string }> = {
    pending_match:      { label: 'Pending Match',      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    matched:            { label: 'Matched',            cls: 'bg-[#2597F8]/10 text-[#2597F8] border-[#2597F8]/20' },
    ready_for_external: { label: 'Ready for External', cls: 'bg-[#29BE98]/10 text-[#29BE98] border-[#29BE98]/20' },
  }
  const { label, cls } = map[status] ?? map.pending_match
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border', cls)}>
      {label}
    </span>
  )
}

// ── Context Menu ──────────────────────────────────────────────────────────────

interface CtxItem { icon: React.ReactNode; label: string; onClick: () => void; variant?: 'danger' }

function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: CtxItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: y, left: x })

  useEffect(() => {
    const handleKey   = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown',   handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('mousedown', handleClick) }
  }, [onClose])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({
      top:  rect.bottom > window.innerHeight ? y - rect.height : y,
      left: rect.right  > window.innerWidth  ? x - rect.width  : x,
    })
  }, [x, y])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[210px] py-1 bg-[#16293A] border border-white/10 rounded-xl shadow-2xl"
      style={{ top: pos.top, left: pos.left }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); item.onClick(); onClose() }}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left',
            item.variant === 'danger' ? 'text-red-400 hover:bg-red-500/10' : 'text-[#94A3B8] hover:text-white hover:bg-white/5',
          )}
        >
          <span className="flex-shrink-0 w-4">{item.icon}</span>{item.label}
        </button>
      ))}
    </div>
  )
}

// ── Bulk Action Bar ───────────────────────────────────────────────────────────

function BulkActionBar({ count, onDelete, onClear, isDeleting }: {
  count: number; onDelete: () => void; onClear: () => void; isDeleting: boolean
}) {
  if (count === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-2xl backdrop-blur-sm">
      <span className="text-sm font-medium text-slate-900">
        <span className="text-[#29BE98] font-bold">{count}</span> selected
      </span>
      <div className="w-px h-5 bg-white/10" />
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        Delete Selected
      </button>
      <button onClick={onClear} className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirmModal({ title, description, onConfirm, onClose, isDeleting }: {
  title: string; description: string; onConfirm: () => void; onClose: () => void; isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[420px] p-6 shadow-2xl">
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
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
<p className="text-xs text-slate-500 mt-0.5">{description}</p>
<button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50">
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}Delete Permanently
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dark file dropzone ────────────────────────────────────────────────────────

const MAX_FILE_MB = 20

function DarkDropzone({ file, onFile, accept = '.xlsx,.xls,.csv' }: { file: File | null; onFile: (f: File) => void; accept?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [sizeError, setSizeError] = useState<string | null>(null)

  const handleFile = useCallback((f: File) => {
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setSizeError(`File is ${(f.size / 1024 / 1024).toFixed(1)} MB — exceeds the ${MAX_FILE_MB} MB limit.`)
      return
    }
    setSizeError(null)
    onFile(f)
  }, [onFile])

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors',
          dragging ? 'border-[#29BE98] bg-[#29BE98]/5' : 'border-slate-300 hover:border-[#29BE98]/60 hover:bg-slate-50',
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {file ? (
          <><FileSpreadsheet className="w-8 h-8 text-[#29BE98]" /><p className="text-sm font-medium text-slate-900">{file.name}</p><p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB — click to replace</p></>
        ) : (
          <><Upload className="w-8 h-8 text-[#94A3B8]" /><div className="text-center"><p className="text-sm font-medium text-slate-900">Drop file here or click to browse</p><p className="text-xs text-slate-500 mt-1">.xlsx · .xls · .csv &nbsp;·&nbsp; max {MAX_FILE_MB} MB</p></div></>
        )}
      </div>
      {sizeError && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600">{sizeError}</p>
        </div>
      )}
    </div>
  )
}

// ── Record Docs Modal (per-record statement files) ────────────────────────────

function RecordDocsModal({ record, onClose }: { record: MasterBalance; onClose: () => void }) {
  const qc = useQueryClient()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [dlError,       setDlError]       = useState<string | null>(null)

  const { data: files = [], isLoading } = useQuery<FileRecord[]>({
    queryKey: ['statement-files', record.counterparty_id],
    queryFn: () => getStatementFiles(record.counterparty_id!),
    enabled: !!record.counterparty_id,
  })

  const deleteFileMutation = useMutation({
    mutationFn: (storageId: string) => deleteStorageFile(storageId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['statement-files', record.counterparty_id] }); setDeletingId(null) },
  })

  async function handleDownload(file: FileRecord) {
    setDownloadingId(file.id)
    setDlError(null)
    try { await downloadStorageFile(file.id, file.filename) }
    catch { setDlError('Download failed.') }
    finally { setDownloadingId(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#29BE98]" />
            <h2 className="text-base font-semibold text-slate-900">Statement Files</h2>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[#29BE98] font-medium">{record.company_name}</p>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 max-h-[380px] overflow-y-auto">
          {dlError && (
            <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" /><p className="text-xs text-red-400">{dlError}</p>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-[#29BE98] animate-spin" /></div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 opacity-50 mb-3" />
              <p className="text-sm text-slate-900">No statement files yet</p>
              <p className="text-xs text-slate-500 mt-1">Upload a statement to enable download.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(file => {
                const isDl  = downloadingId === file.id
                const isDel = deletingId === file.id
                return (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <FileSpreadsheet className="w-8 h-8 text-[#29BE98] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{file.filename}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · {new Date(file.created_at).toLocaleDateString('en-US')}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={isDl}
                        className="p-1.5 rounded-lg text-[#2597F8] hover:bg-[#2597F8]/10 transition-colors disabled:opacity-40"
                        title="Download"
                      >
                        {isDl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setDeletingId(file.id); deleteFileMutation.mutate(file.id) }}
                        disabled={isDel}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        {isDel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── View Statement modal ──────────────────────────────────────────────────────

function ViewStatementModal({ record, onClose, onSend }: { record: MasterBalance; onClose: () => void; onSend: () => void }) {
  const { data: entries = [], isLoading } = useQuery<StatementEntry[]>({
    queryKey: ['statement-entries', record.counterparty_id],
    queryFn: () => getStatementEntries(record.counterparty_id!),
    staleTime: 30_000,
    enabled: !!record.counterparty_id,
  })
  const totalOutstanding = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col max-h-[80vh]">
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 gap-4 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-[#29BE98] flex-shrink-0" /><h2 className="text-base font-semibold text-slate-900">Statement Entries</h2></div>
            <p className="text-xs text-[#29BE98] mt-0.5 font-medium truncate">{record.company_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors flex-shrink-0 mt-0.5"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-[#29BE98] animate-spin" /></div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 opacity-50 mb-3" />
              <p className="text-sm font-medium text-slate-900">No statement entries found</p>
              <p className="text-xs text-slate-500 mt-1">No internal statement has been uploaded for {record.company_name} yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Entries',     value: String(entries.length),                            color: 'text-slate-900' },
                  { label: 'Total Outstanding', value: formatCurrency(totalOutstanding, entries[0]?.currency), color: 'text-[#29BE98]' },
                  { label: 'Currency',          value: entries[0]?.currency ?? record.currency,            color: 'text-slate-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                    <p className={cn('text-base font-bold tabular-nums', color)}>{value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="grid text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5 bg-slate-50 border-b border-slate-200" style={{ gridTemplateColumns: '140px 1fr 110px 56px' }}>
                  <span>Ref No</span><span>Account Name</span><span className="text-right">Outstanding</span><span className="text-right">CCY</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {entries.map(entry => (
                    <div key={entry.id} className="grid items-center px-4 py-2.5 hover:bg-slate-50 transition-colors" style={{ gridTemplateColumns: '140px 1fr 110px 56px' }}>
                      <span className="text-xs font-mono text-[#29BE98] truncate">{entry.transaction_ref}</span>
                      <span className="text-xs text-slate-500 truncate">{entry.description || '—'}</span>
                      <span className="text-xs font-medium text-slate-900 text-right tabular-nums">{formatCurrency(entry.amount, entry.currency)}</span>
                      <span className="text-xs text-slate-400 text-right">{entry.currency}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 flex-shrink-0 gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors">Close</button>
          <button onClick={() => { onSend(); onClose() }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#29BE98] text-white text-sm font-semibold hover:bg-[#29BE98]/90 transition-colors">
            <Mail className="w-4 h-4" />Send Magic Link
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Send Magic Link modal ──────────────────────────────────────────────────────

function SendMagicLinkModal({ record, onClose }: { record: MasterBalance; onClose: () => void }) {
  const [result, setResult] = useState<SendMagicLinkResult | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => sendMagicLinkFromReconciliation(record.counterparty_id!),
    onSuccess: (data: SendMagicLinkResult) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['sessions', record.counterparty_id] })
    },
  })
  const errMsg = extractError(mutation.error)
  const emailErrorHint = errMsg.toLowerCase().includes('email')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#29BE98]" /><h2 className="text-base font-semibold text-slate-900">Send Reconciliation Request</h2></div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#29BE98]/10 border border-[#29BE98]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#29BE98]">{record.company_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{record.company_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Balance on file: {formatCurrency(record.balance, record.currency)}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 border-t border-slate-200 pt-3 leading-relaxed">A secure portal link (valid for 72 hours) will be dispatched to the counterparty's registered accounting email address.</p>
              </div>
              {mutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-red-600 leading-relaxed">{errMsg}</p>
                    {emailErrorHint && <a href="/counterparties" className="inline-flex items-center gap-1 text-xs text-[#2597F8] underline underline-offset-2 mt-1.5">Update email in Counterparties tab<ExternalLink className="w-3 h-3" /></a>}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">Cancel</button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors', mutation.isPending ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#29BE98] text-white hover:bg-[#29BE98]/90')}
                >
                  {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : <><Mail className="w-4 h-4" />Send Magic Link</>}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-[#29BE98]/10 border border-[#29BE98]/20 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-[#29BE98] flex-shrink-0" />
                <div><p className="text-sm font-semibold text-slate-900">Magic link dispatched</p><p className="text-xs text-[#29BE98] mt-0.5 leading-relaxed">{result.message}</p></div>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                {[
                  { label: 'Recipient',           value: result.counterparty_email },
                  { label: 'Token (last 8 chars)', value: `…${result.token_preview}`, mono: true, color: 'text-[#29BE98]' },
                  { label: 'Expires in',           value: '72 hours' },
                ].map(({ label, value, mono, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className={cn('font-medium text-slate-900', mono && 'font-mono tracking-wider', color)}>{value}</span>
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#29BE98] text-white text-sm font-semibold hover:bg-[#29BE98]/90 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Import Master Balances modal ──────────────────────────────────────────────

function ImportMasterModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportMasterResult | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: importMasterBalances,
    onSuccess: (data: ImportMasterResult) => { setResult(data); qc.invalidateQueries({ queryKey: ['master-balances'] }) },
  })
  const errMsg = extractError(mutation.error)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2"><Upload className="w-4 h-4 text-[#29BE98]" /><h2 className="text-base font-semibold text-slate-900">Import Master Balances</h2></div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadMasterBalancesTemplate()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#29BE98] border border-[#29BE98]/20 rounded-lg hover:bg-[#29BE98]/10 transition-colors" title="Download sample template">
              <FileDown className="w-3.5 h-3.5" />Sample Template
            </button>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-slate-900 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expected columns (any order)</p>
                <div className="flex flex-wrap gap-2">
                  {['Company Name', 'Customer Code', 'Tax ID / VAT Number', 'Balance', 'Currency'].map(col => (
                    <span key={col} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs text-slate-500">{col}</span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">Tax ID is used to auto-match or auto-create counterparties.</p>
              </div>
              <DarkDropzone file={file} onFile={setFile} />
              {mutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /><p className="text-xs text-red-400 leading-relaxed">{errMsg}</p>
                </div>
              )}
              <button disabled={!file || mutation.isPending} onClick={() => file && mutation.mutate(file)}
                className={cn('w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors', file && !mutation.isPending ? 'bg-[#29BE98] text-white hover:bg-[#29BE98]/90' : 'bg-[#0C1F30] text-[#64748B] cursor-not-allowed')}>
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</> : <><FileUp className="w-4 h-4" />Import Balances</>}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-[#29BE98]/10 border border-[#29BE98]/20 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-[#29BE98] flex-shrink-0" />
                <div><p className="text-sm font-semibold text-slate-900">Import successful</p><p className="text-xs text-[#29BE98]">{result.imported} records processed</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Imported', value: result.imported,     color: 'text-slate-900' },
                  { label: 'Matched',        value: result.matched,      color: 'text-[#2597F8]' },
                  { label: 'Auto-Created',   value: result.auto_created, color: 'text-amber-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#0C1F30] rounded-xl p-3 text-center border border-white/10">
                    <p className={cn('text-2xl font-bold', color)}>{value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#29BE98] text-white text-sm font-semibold hover:bg-[#29BE98]/90 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Import Statement of Account modal ────────────────────────────────────────

function ImportSOAModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportStatementOfAccountResult | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: importStatementOfAccount,
    onSuccess: (data: ImportStatementOfAccountResult) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['master-balances'] })
      qc.invalidateQueries({ queryKey: ['global-statements'] })
    },
  })
  const errMsg = extractError(mutation.error)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-[#2597F8]" />
            <h2 className="text-base font-semibold text-slate-900">Import Statement of Account</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadStatementOfAccountTemplate()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#2597F8] border border-[#2597F8]/20 rounded-lg hover:bg-[#2597F8]/10 transition-colors" title="Download sample template">
              <FileDown className="w-3.5 h-3.5" />Sample Template
            </button>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-slate-900 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Multi-client consolidated file</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Upload a single file containing statement rows for multiple clients.
                  Each row is auto-routed using the <span className="text-slate-900 font-medium">Customer Code</span> column,
                  matched against existing master balance records.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['Customer Code', 'Account Name', 'Ref No', 'Outstanding', 'CCY'].map(col => (
                    <span key={col} className="px-2.5 py-1 rounded-lg bg-[#2597F8]/10 border border-[#2597F8]/25 text-xs text-[#2597F8] font-medium">{col}</span>
                  ))}
                </div>
              </div>
              <DarkDropzone file={file} onFile={setFile} />
              {mutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /><p className="text-xs text-red-400 leading-relaxed">{errMsg}</p>
                </div>
              )}
              <button disabled={!file || mutation.isPending} onClick={() => file && mutation.mutate(file)}
                className={cn('w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors', file && !mutation.isPending ? 'bg-[#2597F8] text-white hover:bg-[#2597F8]/90' : 'bg-[#0C1F30] text-[#64748B] cursor-not-allowed')}>
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><FileUp className="w-4 h-4" />Import Statement of Account</>}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-[#2597F8]/10 border border-[#2597F8]/20 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-[#2597F8] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Import complete</p>
                  <p className="text-xs text-[#2597F8]">{result.records_saved} records processed across {result.companies_matched} clients</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Total Rows',   value: result.total_rows,        color: 'text-slate-900' },
                  { label: 'Clients Hit',  value: result.companies_matched, color: 'text-[#2597F8]' },
                  { label: 'Saved',        value: result.records_saved,     color: 'text-[#29BE98]' },
                  { label: 'Skipped',      value: result.skipped_rows,      color: 'text-amber-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                    <p className={cn('text-xl font-bold', color)}>{value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {result.details.length > 0 && (
                <div className="rounded-xl border border-white/10 overflow-hidden max-h-48 overflow-y-auto">
                  <div className="grid text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 bg-slate-50 border-b border-slate-200" style={{ gridTemplateColumns: '1fr 1fr 80px' }}>
                    <span>Code</span><span>Company</span><span className="text-right">Saved</span>
                  </div>
                  {result.details.map((d, i) => (
                    <div key={i} className="grid items-center px-4 py-2 border-b border-slate-100 last:border-0" style={{ gridTemplateColumns: '1fr 1fr 80px' }}>
                      <span className="text-xs font-mono text-[#2597F8]">{d.customer_code}</span>
                      <span className="text-xs text-slate-500 truncate">{d.company_name}</span>
                      <span className="text-xs font-medium text-[#29BE98] text-right">{d.rows_saved}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#2597F8] text-white text-sm font-semibold hover:bg-[#2597F8]/90 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Global Statements Docs modal ─────────────────────────────────────────────

function GlobalDocsModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [dlError,       setDlError]       = useState<string | null>(null)

  const { data: archives = [], isLoading } = useQuery<GlobalStatementRecord[]>({
    queryKey: ['global-statements'],
    queryFn: getGlobalStatements,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGlobalStatement(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['global-statements'] }); setDeletingId(null) },
  })

  async function handleDownload(archive: GlobalStatementRecord) {
    setDownloadingId(archive.id)
    setDlError(null)
    try { await downloadGlobalStatement(archive.id, archive.filename) }
    catch { setDlError('Download failed.') }
    finally { setDownloadingId(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-[#2597F8]" />
            <h2 className="text-base font-semibold text-slate-900">Global Statement Archive</h2>
            {!isLoading && <span className="text-xs text-slate-500">({archives.length} file{archives.length !== 1 ? 's' : ''})</span>}
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 max-h-[420px] overflow-y-auto">
          {dlError && (
            <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" /><p className="text-xs text-red-400">{dlError}</p>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-[#2597F8] animate-spin" /></div>
          ) : archives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Archive className="w-10 h-10 text-slate-400 opacity-50 mb-3" />
              <p className="text-sm text-slate-900">No global imports yet</p>
              <p className="text-xs text-slate-500 mt-1">Use "Import Statement of Account" to upload a consolidated multi-client file.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {archives.map(archive => {
                const isDl  = downloadingId === archive.id
                const isDel = deletingId === archive.id
                return (
                  <div key={archive.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-9 h-9 rounded-lg bg-[#2597F8]/10 border border-[#2597F8]/20 flex items-center justify-center flex-shrink-0">
                      <Archive className="w-4 h-4 text-[#2597F8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{archive.filename}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span>{new Date(archive.uploaded_at).toLocaleDateString('en-US')}</span>
                        <span>·</span>
                        <span className="text-[#29BE98]">{archive.records_processed} records</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />{archive.companies_affected} clients
                        </span>
                        <span>·</span>
                        <span>{(archive.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(archive)}
                        disabled={isDl}
                        className="p-1.5 rounded-lg text-[#2597F8] hover:bg-[#2597F8]/10 transition-colors disabled:opacity-40"
                        title="Download"
                      >
                        {isDl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setDeletingId(archive.id); deleteMutation.mutate(archive.id) }}
                        disabled={isDel}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        title="Delete archive"
                      >
                        {isDel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Upload Detailed Internal Statement modal ──────────────────────────────────

function UploadStatementModal({ record, onClose }: { record: MasterBalance; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [done, setDone] = useState(false)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (f: File) => uploadInternalStatement(record.counterparty_id!, f),
    onSuccess: () => {
      setDone(true)
      qc.invalidateQueries({ queryKey: ['master-balances'] })
      qc.invalidateQueries({ queryKey: ['statement-entries', record.counterparty_id] })
      qc.invalidateQueries({ queryKey: ['statement-files', record.counterparty_id] })
    },
  })
  const errMsg = extractError(mutation.error)

  if (!record.counterparty_id) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">No counterparty linked</p>
              <p className="text-sm mt-1.5 text-slate-500 leading-relaxed">Re-import the master balance with a valid <span className="text-slate-900 font-medium">Tax ID / VAT Number</span> column so the system can auto-match or auto-create the counterparty.</p>
            </div>
          </div>
          <button onClick={onClose} className="mt-5 w-full py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 leading-snug">Upload Detailed Internal Statement</h2>
            <p className="text-xs text-[#29BE98] mt-0.5 font-medium truncate">{record.company_name}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => downloadInternalStatementTemplate()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#29BE98] border border-[#29BE98]/20 rounded-lg hover:bg-[#29BE98]/10 transition-colors" title="Download sample template">
              <FileDown className="w-3.5 h-3.5" />Template
            </button>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-slate-900 transition-colors mt-0.5"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!done ? (
            <>
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div><p className="text-slate-500">Company</p><p className="font-medium text-slate-900 mt-0.5">{record.company_name}</p></div>
                <div><p className="text-slate-500">Balance on File</p><p className="font-medium text-slate-900 mt-0.5">{formatCurrency(record.balance, record.currency)}</p></div>
              </div>
              <div className="rounded-xl bg-slate-100 border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Required columns (any order)</p>
                <div className="flex flex-wrap gap-2">
                  {['Account Name', 'Ref No', 'Outstanding', 'CCY'].map(col => (
                    <span key={col} className="px-2.5 py-1 rounded-lg bg-[#29BE98]/10 border border-[#29BE98]/25 text-xs text-[#29BE98] font-medium">{col}</span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">Each row becomes a ledger entry (Company A side). Records are upserted on Ref No.</p>
              </div>
              <DarkDropzone file={file} onFile={setFile} />
              {mutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /><p className="text-xs text-red-400 leading-relaxed">{errMsg}</p>
                </div>
              )}
              <button disabled={!file || mutation.isPending} onClick={() => file && mutation.mutate(file)}
                className={cn('w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors', file && !mutation.isPending ? 'bg-[#2597F8] text-white hover:bg-[#2597F8]/90' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><FileUp className="w-4 h-4" />Upload Statement</>}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-[#29BE98]/10 border border-[#29BE98]/20 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-[#29BE98] flex-shrink-0" />
                <div><p className="text-sm font-semibold text-slate-900">Statement uploaded</p><p className="text-xs text-[#29BE98]">Ledger records saved. Status updated to Ready for External.</p></div>
              </div>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#2597F8] text-white text-sm font-semibold hover:bg-[#2597F8]/90 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReconciliationsPage() {
  const [showImport,     setShowImport]     = useState(false)
  const [showSOA,        setShowSOA]        = useState(false)
  const [showGlobalDocs, setShowGlobalDocs] = useState(false)
  const [uploadRecord,   setUploadRecord]   = useState<MasterBalance | null>(null)
  const [viewRecord,     setViewRecord]     = useState<MasterBalance | null>(null)
  const [sendRecord,     setSendRecord]     = useState<MasterBalance | null>(null)
  const [docsRecord,     setDocsRecord]     = useState<MasterBalance | null>(null)
  const [deleteTarget,   setDeleteTarget]   = useState<MasterBalance | null>(null)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; x: number; y: number; record: MasterBalance | null }>
    ({ visible: false, x: 0, y: 0, record: null })

  const qc = useQueryClient()

  const { data: records = [], isLoading } = useQuery<MasterBalance[]>({
    queryKey: ['master-balances'],
    queryFn: getMasterBalances,
    refetchInterval: 12_000,
  })

  // Keep selection clean
  useEffect(() => {
    setSelected(prev => {
      const ids = new Set(records.map(r => r.id))
      return new Set(Array.from(prev).filter(id => ids.has(id)))
    })
  }, [records.length])

  const allSelected = records.length > 0 && records.every(r => selected.has(r.id))
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(records.map(r => r.id)))
  const toggleOne   = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const stats = {
    total:              records.length,
    matched:            records.filter(r => r.reconciliation_status === 'matched').length,
    pending_match:      records.filter(r => r.reconciliation_status === 'pending_match').length,
    ready_for_external: records.filter(r => r.reconciliation_status === 'ready_for_external').length,
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMasterBalance(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-balances'] }); setDeleteTarget(null) },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteMasterBalances(ids),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-balances'] }); setSelected(new Set()) },
  })

  function handleContextMenu(e: React.MouseEvent, record: MasterBalance) {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, record })
  }

  function ctxItems(record: MasterBalance): CtxItem[] {
    const items: CtxItem[] = []
    if (record.reconciliation_status !== 'ready_for_external') {
      items.push({ icon: <FileUp className="w-3.5 h-3.5" />, label: 'Upload Statement', onClick: () => setUploadRecord(record) })
    }
    if (record.reconciliation_status === 'ready_for_external') {
      items.push({ icon: <Eye className="w-3.5 h-3.5" />, label: 'View Ingested Statement', onClick: () => setViewRecord(record) })
    }
    items.push({ icon: <FolderOpen className="w-3.5 h-3.5" />, label: 'View Statement Files', onClick: () => setDocsRecord(record) })
    items.push({ icon: <Trash2 className="w-3.5 h-3.5" />, label: 'Delete Record', onClick: () => setDeleteTarget(record), variant: 'danger' })
    return items
  }

  const GRID = '40px 1fr 120px 160px 130px 80px 160px 210px'

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reconciliation List</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Import master balances, upload internal statements, and dispatch reconciliation invitations.
            </p>
          </div>
          {/* Header action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Global Docs */}
            <button
              onClick={() => setShowGlobalDocs(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm hover:text-slate-900 hover:border-slate-300 transition-colors"
              title="View global statement archive"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Global Docs</span>
            </button>
            {/* Import SOA */}
            <button
              onClick={() => setShowSOA(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2597F8]/10 border border-[#2597F8]/25 text-[#2597F8] text-sm font-semibold hover:bg-[#2597F8]/20 transition-colors"
            >
              <Archive className="w-4 h-4" />
              Import Statement of Account
            </button>
            {/* Import Master Balances */}
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#29BE98] text-white text-sm font-semibold hover:bg-[#29BE98]/90 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Import Master Balances
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',              value: stats.total,              color: 'text-slate-900',   bg: 'bg-white',            border: 'border-slate-200' },
            { label: 'Matched',            value: stats.matched,            color: 'text-[#2597F8]',   bg: 'bg-[#2597F8]/10',     border: 'border-[#2597F8]/20' },
            { label: 'Pending Match',      value: stats.pending_match,      color: 'text-amber-600',   bg: 'bg-amber-50',         border: 'border-amber-200' },
            { label: 'Ready for External', value: stats.ready_for_external, color: 'text-[#29BE98]',   bg: 'bg-[#29BE98]/10',     border: 'border-[#29BE98]/20' },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} className={cn('rounded-2xl border p-4', bg, border)}>
              <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Column headers */}
          <div
            className="grid text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 border-b border-slate-200 bg-slate-50"
            style={{ gridTemplateColumns: GRID }}
          >
            {/* Master checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-slate-300 bg-white accent-[#29BE98] cursor-pointer"
              />
            </div>
            <span>Company Name</span>
            <span>Code</span>
            <span>Tax ID</span>
            <span className="text-right">Balance</span>
            <span>CCY</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
              <FileSpreadsheet className="w-10 h-10 opacity-30" />
              <p className="text-sm">No master balances imported yet.</p>
              <button onClick={() => setShowImport(true)} className="text-xs text-[#29BE98] underline underline-offset-2">Import your first file</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {records.map(record => {
                const isChecked = selected.has(record.id)

                return (
                  <div
                    key={record.id}
                    className={cn(
                      'grid items-center px-5 py-3.5 transition-colors cursor-default select-none',
                      isChecked ? 'bg-[#2597F8]/10' : 'hover:bg-slate-50',
                    )}
                    style={{ gridTemplateColumns: GRID }}
                    onContextMenu={e => handleContextMenu(e, record)}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(record.id)}
                        className="w-4 h-4 rounded border-white/20 bg-[#0C1F30] accent-[#29BE98] cursor-pointer"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{record.company_name}</p>
                      {record.auto_created_counterparty && (
                        <p className="text-[10px] text-amber-500 mt-0.5">Auto-created counterparty</p>
                      )}
                    </div>
                    <span className="text-sm text-slate-500 truncate">{record.customer_code || '—'}</span>
                    <span className="text-sm text-slate-500 font-mono truncate">{record.tax_id || '—'}</span>
                    <span className="text-sm font-medium text-slate-900 text-right tabular-nums">
                      {formatCurrency(record.balance, record.currency)}
                    </span>
                    <span className="text-sm text-[#94A3B8]">{record.currency}</span>
                    <StatusBadge status={record.reconciliation_status} />

                    {/* Row actions */}
                    <div className="flex justify-end gap-1.5">
                      {/* Docs button */}
                      <button
                        onClick={e => { e.stopPropagation(); setDocsRecord(record) }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#2597F8] hover:bg-[#2597F8]/10 transition-colors"
                        title="View statement files"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>

                      {record.reconciliation_status === 'ready_for_external' ? (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); setViewRecord(record) }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#29BE98]/10 text-[#29BE98] hover:bg-[#29BE98]/20 transition-colors"
                          >
                            <Eye className="w-3 h-3" />View
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setSendRecord(record) }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#29BE98] text-white hover:bg-[#29BE98]/90 transition-colors"
                          >
                            <Mail className="w-3 h-3" />Send Link
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setUploadRecord(record) }}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            record.counterparty_id
                              ? 'bg-[#2597F8]/10 text-[#2597F8] hover:bg-[#2597F8]/20'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900',
                          )}
                        >
                          <FileUp className="w-3.5 h-3.5" />Upload Statement<ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(record) }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Workflow legend */}
        <div className="flex items-center gap-6 px-1 text-[11px] text-[#64748B] flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Pending Match — import with valid Tax ID</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2597F8]" />Matched — upload internal statement</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#29BE98]" />Ready for External — view &amp; send link</span>
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      <BulkActionBar
        count={selected.size}
        onDelete={() => bulkDeleteMutation.mutate(Array.from(selected))}
        onClear={() => setSelected(new Set())}
        isDeleting={bulkDeleteMutation.isPending}
      />

      {/* ── Context Menu ── */}
      {ctxMenu.visible && ctxMenu.record && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems(ctxMenu.record)}
          onClose={() => setCtxMenu(p => ({ ...p, visible: false }))}
        />
      )}

      {/* ── Modals ── */}
      {showImport    && <ImportMasterModal onClose={() => setShowImport(false)} />}
      {showSOA       && <ImportSOAModal    onClose={() => setShowSOA(false)} />}
      {showGlobalDocs && <GlobalDocsModal  onClose={() => setShowGlobalDocs(false)} />}
      {uploadRecord  && <UploadStatementModal record={uploadRecord} onClose={() => setUploadRecord(null)} />}
      {viewRecord    && (
        <ViewStatementModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onSend={() => { setSendRecord(viewRecord); setViewRecord(null) }}
        />
      )}
      {sendRecord    && <SendMagicLinkModal record={sendRecord} onClose={() => setSendRecord(null)} />}
      {docsRecord    && <RecordDocsModal   record={docsRecord}  onClose={() => setDocsRecord(null)} />}
      {deleteTarget  && (
        <DeleteConfirmModal
          title={`Delete ${deleteTarget.company_name}?`}
          description="This will permanently delete this master balance record, all associated statement entries, and stored files. This action cannot be undone."
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </AppShell>
  )
}
