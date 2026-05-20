'use client'
import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

type Phase = 'hidden' | 'running' | 'done' | 'error'

interface State { phase: Phase; runId: string | null; found: number }

export const AGENT_EVENT = 'lumina:agent'

export function fireAgentIsland(runId: string) {
  window.dispatchEvent(new CustomEvent(AGENT_EVENT, { detail: { runId } }))
}

export function AgentIsland() {
  const [state, setState] = useState<State>({ phase: 'hidden', runId: null, found: 0 })

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setState({ phase: 'running', runId: e.detail.runId, found: 0 })
    }
    window.addEventListener(AGENT_EVENT, handler as EventListener)
    return () => window.removeEventListener(AGENT_EVENT, handler as EventListener)
  }, [])

  useEffect(() => {
    if (state.phase !== 'running' || !state.runId) return
    const id = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/v1/reconciliation/status/${state.runId}`)
        if (data.status === 'completed') {
          setState(s => ({ ...s, phase: 'done', found: data.discrepancies_found ?? 0 }))
          clearInterval(id)
          setTimeout(() => setState(s => ({ ...s, phase: 'hidden' })), 5000)
        } else if (data.status === 'failed') {
          setState(s => ({ ...s, phase: 'error' }))
          clearInterval(id)
          setTimeout(() => setState(s => ({ ...s, phase: 'hidden' })), 4000)
        }
      } catch { /* ignore */ }
    }, 1500)
    return () => clearInterval(id)
  }, [state.phase, state.runId])

  if (state.phase === 'hidden') return null

  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]',
      'flex items-center gap-2.5 px-5 py-3 rounded-full border shadow-2xl',
      'animate-in slide-in-from-bottom-4 duration-300',
      state.phase === 'running' && 'bg-slate-900 border-blue-500/40 text-blue-400',
      state.phase === 'done'    && 'bg-slate-900 border-emerald-500/40 text-emerald-400',
      state.phase === 'error'   && 'bg-slate-900 border-red-500/40 text-red-400',
    )}>
      {state.phase === 'running' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium text-white">Agent running</span>
          <span className="flex gap-0.5 ml-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        </>
      )}
      {state.phase === 'done' && (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium text-white">
            {state.found} discrepancies found
          </span>
          {state.found > 0 && (
            <span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
              +{state.found}
            </span>
          )}
        </>
      )}
      {state.phase === 'error' && (
        <>
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium text-white">Agent failed</span>
        </>
      )}
    </div>
  )
}