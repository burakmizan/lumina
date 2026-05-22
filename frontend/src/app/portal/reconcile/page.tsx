'use client'
import { useState, useCallback, useRef, DragEvent, ChangeEvent, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Zap, Upload, FileSpreadsheet, FileText, CheckCircle2,
  XCircle, AlertTriangle, Loader2, X,
} from 'lucide-react'
import { validatePortalToken, uploadPortalFile } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { TokenValidationResponse, PortalUploadResponse } from '@/types'

type Phase = 'loading' | 'invalid' | 'upload' | 'uploading' | 'success' | 'error'

const ACCEPTED = '.xlsx,.xls,.csv,.pdf'
const ACCEPTED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/pdf',
]

function isAcceptedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ['xlsx', 'xls', 'csv', 'pdf'].includes(ext) || ACCEPTED_MIME.includes(file.type)
}

export default function ReconcilePortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-primary flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  )
}

function PortalContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [phase, setPhase]               = useState<Phase>('loading')
  const [session, setSession]           = useState<TokenValidationResponse | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging]     = useState(false)
  const [uploadResult, setUploadResult] = useState<PortalUploadResponse | null>(null)
  const [errorMsg, setErrorMsg]         = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) {
      setPhase('invalid')
      return
    }
    validatePortalToken(token)
      .then((data: TokenValidationResponse) => {
        setSession(data)
        setPhase(data.valid ? 'upload' : 'invalid')
      })
      .catch(() => setPhase('invalid'))
  }, [token])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && isAcceptedFile(file)) setSelectedFile(file)
  }, [])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }, [])

  async function handleUpload() {
    if (!selectedFile || !token) return
    setPhase('uploading')
    try {
      const result: PortalUploadResponse = await uploadPortalFile(token, selectedFile)
      setUploadResult(result)
      setPhase('success')
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'An error occurred while uploading. Please try again.',
      )
      setPhase('error')
    }
  }

  function getFileIcon(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-400" />
    return <FileSpreadsheet className="w-5 h-5 text-accent-green" />
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col items-center justify-center p-6">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(37,151,248,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-[480px] relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-3 mb-8">
          <img src="/lumina.png" alt="Lumina Logo" className="h-10 w-auto object-contain" />
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">
            Secure Reconciliation Portal
          </p>
        </div>

        {/* Loading */}
        {phase === 'loading' && (
          <div className="bg-surface-secondary border border-surface-border rounded-2xl p-10 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
            <p className="text-text-secondary text-sm">Validating token…</p>
          </div>
        )}

        {/* Invalid token */}
        {phase === 'invalid' && (
          <div className="bg-surface-secondary border border-red-500/20 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-white font-semibold mb-2">Invalid or Expired Link</h2>
            <p className="text-text-muted text-sm leading-relaxed">
              {session?.message ??
                'This reconciliation link is invalid or has expired. Please contact the requesting company.'}
            </p>
          </div>
        )}

        {/* Upload screen */}
        {(phase === 'upload' || phase === 'uploading') && session?.valid && (
          <div className="bg-surface-secondary border border-surface-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-5 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2597F8] animate-pulse" />
                <p className="text-[10px] uppercase tracking-widest text-[#2597F8] font-medium">
                  End-of-Period Reconciliation
                </p>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Ledger Statement Upload</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Dear{' '}
                <span className="text-slate-900 font-semibold">{session.counterparty_name}</span>, your
                end-of-period reconciliation process with{' '}
                <span className="text-slate-900 font-semibold">{session.initiating_company_name}</span> has
                started.
              </p>
            </div>

            <div className="px-6 py-5">
              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && inputRef.current?.click()}
                className={cn(
                  'relative rounded-xl border-2 border-dashed transition-all duration-200',
                  'flex flex-col items-center justify-center text-center',
                  selectedFile ? 'py-5 cursor-default' : 'py-10 cursor-pointer',
                  isDragging
                    ? 'border-accent-blue bg-accent-blue/5 scale-[1.01]'
                    : selectedFile
                    ? 'border-accent-green/40 bg-accent-green/5'
                    : 'border-surface-border hover:border-accent-blue/40 hover:bg-accent-blue/5',
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED}
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3 px-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      {getFileIcon(selectedFile)}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setSelectedFile(null)
                        if (inputRef.current) inputRef.current.value = ''
                      }}
                      className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-1">
                      {isDragging ? 'Drop your file here' : 'Drag & drop your file or browse'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Excel (.xlsx, .xls), CSV or PDF · Max. 20 MB
                    </p>
                  </>
                )}
              </div>

              {/* Format hint */}
              <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-surface-primary border border-surface-border rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Any ERP format (SAP, Oracle, Dynamics, Sage) is supported. Lumina AI will
                  automatically detect date, amount, and reference columns.
                </p>
              </div>

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || phase === 'uploading'}
                className={cn(
                  'mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
                  selectedFile && phase !== 'uploading'
                    ? 'bg-accent-blue hover:bg-accent-blue-hover text-white shadow-sm'
                    : 'bg-surface-primary border border-surface-border text-text-muted cursor-not-allowed',
                )}
              >
                {phase === 'uploading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload &amp; Submit Statement
                  </>
                )}
              </button>
            </div>

            <div className="px-6 pb-5">
              <p className="text-[11px] text-text-muted text-center">
                Your data is transmitted over an encrypted connection and used solely for
                reconciliation purposes.
              </p>
            </div>
          </div>
        )}

        {/* Success */}
        {phase === 'success' && uploadResult && (
          <div className="bg-surface-secondary border border-accent-green/20 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-6 pt-7 pb-6 text-center border-b border-surface-border">
              <div className="w-14 h-14 rounded-2xl bg-accent-green/15 border border-accent-green/25 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-accent-green" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Statement Received</h2>
              <p className="text-text-muted text-sm leading-relaxed">
                Your file has been securely uploaded and queued for AI analysis.
              </p>
            </div>

            {/* File detail */}
            {selectedFile && (
              <div className="px-6 py-4 border-b border-surface-border">
                <div className="flex items-center gap-3 p-3 bg-surface-primary rounded-xl border border-surface-border">
                  <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center flex-shrink-0">
                    {selectedFile.name.toLowerCase().endsWith('.pdf')
                      ? <FileText className="w-4 h-4 text-accent-green" />
                      : <FileSpreadsheet className="w-4 h-4 text-accent-green" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-text-muted">
                      {selectedFile.size < 1024 * 1024
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`
                      } · Uploaded successfully
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
                </div>
              </div>
            )}

            {/* AI status */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 p-3 bg-accent-blue/5 border border-accent-blue/15 rounded-xl mb-4">
                <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse flex-shrink-0" />
                <p className="text-sm text-accent-blue font-medium">
                  AI reconciliation analysis in progress…
                </p>
              </div>
              <p className="text-[11px] text-text-muted text-center leading-relaxed">
                Results will appear in the Lumina dashboard shortly.<br />
                You will be notified by email when the analysis is complete.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="bg-surface-secondary border border-red-500/20 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-white font-semibold mb-2">Upload Failed</h2>
            <p className="text-text-muted text-sm leading-relaxed mb-5">{errorMsg}</p>
            <button
              onClick={() => { setPhase('upload'); setSelectedFile(null); setErrorMsg('') }}
              className="px-5 py-2.5 bg-surface-primary border border-surface-border hover:border-surface-tertiary text-sm text-white rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        <p className="text-center text-xs text-text-muted mt-6 opacity-60">
          Lumina · Secure B2B Reconciliation Platform
        </p>
      </div>
    </div>
  )
}
