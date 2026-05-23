'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, Loader2, Sparkles, Database, ChevronRight, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { chatWithGemini } from '@/lib/api'
import ReactMarkdown from 'react-markdown'

export const GEMINI_EVENT = 'lumina:gemini'

export function openGeminiPanel(opts?: { contextMessage?: string; context?: Record<string, unknown>; page?: string }) {
  window.dispatchEvent(new CustomEvent(GEMINI_EVENT, { detail: opts ?? {} }))
}

function LuminaStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="url(#lumina-grad)">
      <defs>
        <linearGradient id="lumina-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#00D4FF" />
          <stop offset="50%"  stopColor="#00E676" />
          <stop offset="100%" stopColor="#AEEA00" />
        </linearGradient>
      </defs>
      <path d="M12 1 C12 9 15 12 23 12 C15 12 12 15 12 23 C12 15 9 12 1 12 C9 12 12 9 12 1 Z" />
    </svg>
  )
}

type Msg = { role: 'user' | 'assistant'; content: string }

export function GeminiPanel() {
  const [open, setOpen] = useState(false)

  // Keyboard shortcut: L → open Gemini panel
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('lumina:kb:open_gemini', handler)
    return () => window.removeEventListener('lumina:kb:open_gemini', handler)
  }, [])
  const [messages, setMessages]   = useState<Msg[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]           = useState(false)
  const [context, setContext]           = useState<Record<string, unknown> | undefined>()
  const [page, setPage]                 = useState<string | undefined>()
  const [pendingContext, setPendingContext] = useState<{ label: string; message: string } | null>(null)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setOpen(true)
      if (e.detail.context)  setContext(e.detail.context)
      if (e.detail.page)     setPage(e.detail.page)
      if (e.detail.contextMessage) {
        setPendingContext({
          label:   e.detail.context?.company_name as string
                ?? e.detail.context?.ledger_ref as string
                ?? 'Context',
          message: e.detail.contextMessage,
        })
      }
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    window.addEventListener(GEMINI_EVENT, handler as EventListener)
    return () => window.removeEventListener(GEMINI_EVENT, handler as EventListener)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const fullMessage = pendingContext
      ? `${pendingContext.message}\n\n${text}`
      : text
    const userMsg: Msg = { role: 'user', content: fullMessage }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setPendingContext(null)
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await chatWithGemini({ message: fullMessage, context, history, page })
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, context, page])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const panel = (
    <>
      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-[400]" onClick={() => setOpen(false)} />}

      {/* Panel */}
      <div className={cn(
        'fixed top-0 right-0 h-full w-[420px] bg-white border-l border-slate-200 shadow-2xl z-[401]',
        'flex flex-col transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              <LuminaStar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Ask Lumina</p>
              <p className="text-[10px] text-slate-400">Powered by Gemini · Live data access</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setContext(undefined) }}
                className="text-[10px] text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              >
                Clear
              </button>
            )}
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Context badge */}
        {context && (
          <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100">
            <div className="flex items-center gap-1.5 text-xs text-teal-700">
              <Database className="w-3 h-3" />
              <span className="font-medium">Context loaded:</span>
              <span className="truncate opacity-70">{context.company_name as string || context.type as string || 'Current view'}</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-3">
                <Bot className="w-6 h-6 text-teal-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">Lumina AI Assistant</p>
              <p className="text-xs text-slate-400 max-w-[260px]">
                Ask me anything about your reconciliations, discrepancies, or company balances. I have access to your live data.
              </p>
              <div className="mt-4 flex flex-col gap-2 w-full max-w-[280px]">
                {[
                  'How many discrepancies are pending approval?',
                  'What are the most common discrepancy types?',
                  'Summarize this company\'s reconciliation status',
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-left text-xs bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-600 hover:text-teal-700 px-3 py-2 rounded-xl transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'text-white rounded-br-sm'
                  : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-bl-sm',
              )}>
                {msg.role === 'assistant'
                  ? <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  : msg.content
                }
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                <Sparkles className="w-3 h-3 text-teal-600" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white">
          {pendingContext && (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-teal-100 border border-teal-200 flex items-center justify-center flex-shrink-0">
                <Database className="w-3 h-3 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-teal-700 truncate">{pendingContext.label}</p>
                <p className="text-[10px] text-teal-400">Context attached · will be sent with your message</p>
              </div>
              <button onClick={() => setPendingContext(null)} className="p-0.5 rounded text-teal-300 hover:text-teal-600 transition-colors flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your data…"
              rows={1}
              className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none resize-none max-h-32"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-1.5 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00D4FF, #00E676)' }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Floating trigger button — animated gradient border */}
      <div
        className="fixed bottom-6 right-6 z-[399] overflow-hidden shadow-xl hover:shadow-2xl transition-shadow"
        style={{ borderRadius: '28px', padding: '2px' }}
      >
        {/* Spinning gradient layer */}
        <div
          className="absolute animate-spin pointer-events-none"
          style={{
            inset: '-150%',
            background: 'conic-gradient(from 0deg, #00D4FF 0%, #00E676 30%, #AEEA00 55%, #00E676 80%, #00D4FF 100%)',
            animationDuration: '4s',
            animationTimingFunction: 'linear',
          }}
        />
        {/* Content */}
        <button
          onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 150) }}
          className="relative flex items-center gap-2.5 px-5 py-3 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          style={{ borderRadius: '26px' }}
        >
          <LuminaStar className="w-5 h-5" />
          <span className="text-sm font-bold text-slate-900 tracking-tight">Ask Lumina</span>
        </button>
      </div>

      {typeof window !== 'undefined' ? createPortal(panel, document.body) : null}
    </>
  )
}