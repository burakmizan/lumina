'use client'
import { useState, useCallback, useRef, DragEvent, ChangeEvent, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Upload, FileSpreadsheet, FileText, CheckCircle2,
  XCircle, AlertTriangle, Loader2, X, Zap, Shield, Lock,
} from 'lucide-react'
import { validatePortalToken, uploadPortalFile } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { TokenValidationResponse, PortalUploadResponse } from '@/types'

type Phase = 'loading' | 'invalid' | 'upload' | 'uploading' | 'success' | 'error'

const ACCEPTED      = '.xlsx,.xls,.csv,.pdf'
const ACCEPTED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/pdf',
]

function isAcceptedFile(f: File) {
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  return ['xlsx', 'xls', 'csv', 'pdf'].includes(ext) || ACCEPTED_MIME.includes(f.type)
}

// ── Burst particles on success ────────────────────────────────────────────────
function SuccessBurst() {
  const dots = Array.from({ length: 16 }, (_, i) => ({
    angle: (i / 16) * 360,
    r:     55 + (i % 3) * 15,
    color: ['#29BE98','#34D399','#6EE7B7','#2597F8','#fff'][i % 5],
    s:     3 + (i % 3) * 2,
    delay: (i % 4) * 0.07,
  }))
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {dots.map((d, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            width: d.s, height: d.s, background: d.color,
            transform: `rotate(${d.angle}deg) translateY(-${d.r}px)`,
            animation: `ping 1s cubic-bezier(0,0,0.2,1) ${d.delay}s both`,
          }}
        />
      ))}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ReconcilePortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#040F0A 0%,#071810 50%,#0A2018 100%)' }}>
        <Loader2 className="w-7 h-7 text-[#29BE98] animate-spin" />
      </div>
    }>
      <PortalContent />
    </Suspense>
  )
}

function PortalContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [phase,          setPhase]          = useState<Phase>('loading')
  const [session,        setSession]        = useState<TokenValidationResponse | null>(null)
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null)
  const [isDragging,     setIsDragging]     = useState(false)
  const [uploadResult,   setUploadResult]   = useState<PortalUploadResponse | null>(null)
  const [errorMsg,       setErrorMsg]       = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) { setPhase('invalid'); return }
    validatePortalToken(token)
      .then((d: TokenValidationResponse) => { setSession(d); setPhase(d.valid ? 'upload' : 'invalid') })
      .catch(() => setPhase('invalid'))
  }, [token])

  // Fake progress during upload
  useEffect(() => {
    if (phase !== 'uploading') { setUploadProgress(0); return }
    const t = setInterval(() => setUploadProgress(p => Math.min(p + Math.random() * 12, 88)), 380)
    return () => clearInterval(t)
  }, [phase])

  const handleDragOver  = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true)  }, [])
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }, [])
  const handleDrop      = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && isAcceptedFile(f)) setSelectedFile(f)
  }, [])
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setSelectedFile(f)
  }, [])

  async function handleUpload() {
    if (!selectedFile || !token) return
    setPhase('uploading')
    try {
      const result: PortalUploadResponse = await uploadPortalFile(token, selectedFile)
      setUploadProgress(100)
      setUploadResult(result)
      setTimeout(() => setPhase('success'), 350)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setPhase('error')
    }
  }

  function fileIcon(f: File) {
    return f.name.endsWith('.pdf')
      ? <FileText className="w-5 h-5 text-red-400" />
      : <FileSpreadsheet className="w-5 h-5 text-[#29BE98]" />
  }

  function fmtBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
    return `${(b/1048576).toFixed(1)} MB`
  }

  const initials = session?.initiating_company_name?.slice(0, 2).toUpperCase() ?? 'LC'

  // ── Shared card style ──────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background:    'rgba(10,24,18,0.92)',
    border:        '1px solid rgba(41,190,152,0.18)',
    backdropFilter:'blur(24px)',
    borderRadius:  '20px',
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#040F0A 0%,#071810 50%,#0A2018 100%)' }}>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:'linear-gradient(rgba(41,190,152,1) 1px,transparent 1px),linear-gradient(90deg,rgba(41,190,152,1) 1px,transparent 1px)',
          backgroundSize:'40px 40px',
        }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.05] blur-3xl pointer-events-none"
        style={{ background:'radial-gradient(circle,#29BE98,transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-[0.04] blur-3xl pointer-events-none"
        style={{ background:'radial-gradient(circle,#2597F8,transparent)' }} />

      <div className="w-full max-w-[460px] relative z-10">

        {/* ── Top branding ── */}
        <div className="flex flex-col items-center mb-7">
          <img src="/lumina.png" alt="Lumina"
            className="h-14 w-auto object-contain mb-5"
            style={{ filter:'brightness(0) invert(1)' }} />

          {session?.initiating_company_name && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
              style={{ background:'rgba(41,190,152,0.07)', border:'1px solid rgba(41,190,152,0.18)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background:'linear-gradient(135deg,#29BE98 0%,#2597F8 100%)' }}>
                {initials}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[9px] text-[#29BE98] font-semibold uppercase tracking-widest">Reconciliation request from</p>
                <p className="text-sm font-bold text-white truncate">{session.initiating_company_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Loading ── */}
        {phase === 'loading' && (
          <div className="p-12 flex flex-col items-center gap-5" style={card}>
            <div className="w-12 h-12 rounded-full border-2 animate-spin"
              style={{ borderColor:'rgba(41,190,152,0.15)', borderTopColor:'#29BE98' }} />
            <p className="text-white/50 text-sm">Validating secure token…</p>
          </div>
        )}

        {/* ── Invalid ── */}
        {phase === 'invalid' && (
          <div className="p-8 text-center" style={{ ...card, borderColor:'rgba(239,68,68,0.2)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">Invalid or Expired Link</h2>
            <p className="text-white/45 text-sm leading-relaxed">
              {session?.message ?? 'This reconciliation link is invalid or has expired. Please contact the requesting company.'}
            </p>
          </div>
        )}

        {/* ── Upload / Uploading ── */}
        {(phase === 'upload' || phase === 'uploading') && session?.valid && (
          <div style={card} className="overflow-hidden">

            {/* Card header */}
            <div className="px-6 pt-6 pb-5" style={{ borderBottom:'1px solid rgba(41,190,152,0.1)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#29BE98] animate-pulse" />
                <p className="text-[10px] text-[#29BE98] font-semibold uppercase tracking-widest">Secure Reconciliation Portal</p>
              </div>
              <h2 className="text-xl font-bold text-white">Upload Ledger Statement</h2>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">
                Dear <span className="text-white font-semibold">{session.counterparty_name}</span>, please
                upload your statement for reconciliation with{' '}
                <span className="text-[#29BE98] font-semibold">{session.initiating_company_name}</span>.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && phase !== 'uploading' && inputRef.current?.click()}
                className={cn(
                  'relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden',
                  selectedFile || phase === 'uploading' ? 'py-4 cursor-default' : 'py-10 cursor-pointer',
                  isDragging ? 'scale-[1.015]' : '',
                )}
                style={{
                  borderColor: isDragging ? '#29BE98'
                    : selectedFile ? 'rgba(41,190,152,0.45)'
                    : 'rgba(41,190,152,0.18)',
                  background: isDragging ? 'rgba(41,190,152,0.07)'
                    : selectedFile ? 'rgba(41,190,152,0.04)'
                    : 'rgba(41,190,152,0.02)',
                }}
              >
                <input ref={inputRef} type="file" accept={ACCEPTED} onChange={handleFileChange} className="hidden" />

                {/* Uploading state */}
                {phase === 'uploading' && selectedFile && (
                  <div className="px-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background:'rgba(41,190,152,0.15)' }}>
                        {fileIcon(selectedFile)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
                        <p className="text-xs text-white/35">{fmtBytes(selectedFile.size)}</p>
                      </div>
                      <Loader2 className="w-4 h-4 text-[#29BE98] animate-spin flex-shrink-0" />
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(41,190,152,0.1)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width:`${uploadProgress}%`, background:'linear-gradient(90deg,#29BE98,#2597F8)' }} />
                    </div>
                    <p className="text-[11px] text-white/35 mt-2 text-center">
                      Lumina AI is parsing & normalizing your statement…
                    </p>
                  </div>
                )}

                {/* File selected */}
                {selectedFile && phase !== 'uploading' && (
                  <div className="flex items-center gap-3 px-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background:'rgba(41,190,152,0.15)' }}>
                      {fileIcon(selectedFile)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
                      <p className="text-xs text-white/40">{fmtBytes(selectedFile.size)}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setSelectedFile(null) }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ background:'rgba(255,255,255,0.06)' }}>
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                )}

                {/* Idle — no file */}
                {!selectedFile && phase !== 'uploading' && (
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300',
                      isDragging ? 'scale-110 -translate-y-1' : '',
                    )}
                      style={{
                        background: isDragging ? 'rgba(41,190,152,0.2)' : 'rgba(41,190,152,0.1)',
                        border: '1px solid rgba(41,190,152,0.2)',
                      }}>
                      <Upload className={cn('w-6 h-6 text-[#29BE98] transition-transform duration-300', isDragging && '-translate-y-0.5')} />
                    </div>
                    <p className="text-sm font-bold text-white mb-1">
                      {isDragging ? 'Release to upload' : 'Drag & drop your statement'}
                    </p>
                    <p className="text-xs text-white/35 mb-4">or click to browse</p>
                    <div className="flex items-center gap-2">
                      {['XLSX','XLS','CSV','PDF'].map(f => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold"
                          style={{ background:'rgba(41,190,152,0.08)', color:'#29BE98', border:'1px solid rgba(41,190,152,0.15)' }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload button */}
              {selectedFile && phase !== 'uploading' && (
                <button onClick={handleUpload}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.99]"
                  style={{ background:'linear-gradient(135deg,#29BE98,#22a085)', boxShadow:'0 4px 20px rgba(41,190,152,0.28)' }}>
                  <Upload className="w-4 h-4" />
                  Upload Statement
                </button>
              )}

              {/* Security note */}
              <div className="flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3 text-white/20" />
                <p className="text-[10px] text-white/20">256-bit encrypted · Token expires in 72 hours</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Success ── */}
        {phase === 'success' && (
          <div className="p-8 text-center relative overflow-hidden"
            style={{ ...card, borderColor:'rgba(41,190,152,0.3)' }}>
            <SuccessBurst />

            <div className="relative inline-flex mb-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background:'rgba(41,190,152,0.1)', border:'2px solid rgba(41,190,152,0.4)' }}>
                <CheckCircle2 className="w-10 h-10 text-[#29BE98]" />
              </div>
              <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ border:'2px solid #29BE98' }} />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Statement Received!</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-1">
              Your ledger has been securely delivered to{' '}
              <span className="text-[#29BE98] font-semibold">{session?.initiating_company_name}</span>.
            </p>
            {(uploadResult as unknown as { records_processed?: number } | null)?.records_processed && (
              <p className="text-white/60 text-sm font-semibold mb-5">
                {(uploadResult as unknown as { records_processed: number }).records_processed} transaction records processed.
              </p>
            )}

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mt-4"
              style={{ background:'rgba(41,190,152,0.07)', border:'1px solid rgba(41,190,152,0.15)' }}>
              <Loader2 className="w-4 h-4 text-[#29BE98] animate-spin flex-shrink-0" />
              <p className="text-xs text-white/45 text-left">
                Lumina AI reconciliation agent is running. You will be notified when results are ready.
              </p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {phase === 'error' && (
          <div className="p-8" style={{ ...card, borderColor:'rgba(239,68,68,0.2)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">Upload Failed</h2>
            <p className="text-white/45 text-sm leading-relaxed mb-5">{errorMsg}</p>
            <button
              onClick={() => { setPhase('upload'); setSelectedFile(null); setErrorMsg('') }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#29BE98] border border-[#29BE98]/20 hover:bg-[#29BE98]/10 transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Zap className="w-3 h-3 text-[#29BE98]/50" />
          <p className="text-[11px] text-white/20">
            Powered by <span className="text-[#29BE98]/60 font-semibold">Lumina AI</span>
            {' · '}Reconciliation Reinvented.
          </p>
          <Shield className="w-3 h-3 text-[#29BE98]/50" />
        </div>

      </div>
    </div>
  )
}