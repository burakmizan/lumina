'use client'
import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

type Phase = 'hidden' | 'running' | 'done' | 'error'

interface Step { type: string; message: string; timestamp: string }
interface State { phase: Phase; runId: string | null; found: number; currentStep: string; steps: Step[] }

export const AGENT_EVENT = 'lumina:agent'

export function fireAgentIsland(runId: string) {
  window.dispatchEvent(new CustomEvent(AGENT_EVENT, { detail: { runId } }))
}

export function AgentIsland() {
  const [state, setState] = useState<State>({
    phase: 'hidden', runId: null, found: 0, currentStep: 'Initializing...', steps: []
  })

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setState({ phase: 'running', runId: e.detail.runId, found: 0, currentStep: 'Starting agent...', steps: [] })
    }
    window.addEventListener(AGENT_EVENT, handler as EventListener)
    return () => window.removeEventListener(AGENT_EVENT, handler as EventListener)
  }, [])

  useEffect(() => {
    if (state.phase !== 'running' || !state.runId) return
    const id = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/v1/reconciliation/status/${state.runId}`)
        const steps: Step[] = data.steps || []
        const currentStep = steps.length > 0 ? steps[steps.length - 1].message : 'Processing...'
        if (data.status === 'completed') {
          setState(s => ({ ...s, phase: 'done', found: data.discrepancies_found ?? 0, currentStep: 'Complete', steps }))
          clearInterval(id)
          setTimeout(() => setState(s => ({ ...s, phase: 'hidden' })), 6000)
        } else if (data.status === 'failed') {
          setState(s => ({ ...s, phase: 'error', currentStep: 'Run failed', steps }))
          clearInterval(id)
          setTimeout(() => setState(s => ({ ...s, phase: 'hidden' })), 4000)
        } else {
          setState(s => ({ ...s, currentStep, steps }))
        }
      } catch { /* ignore */ }
    }, 1500)
    return () => clearInterval(id)
  }, [state.phase, state.runId])

  if (state.phase === 'hidden') return null

  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]',
      'bg-white border shadow-2xl rounded-[28px] px-5 py-3.5',
      'animate-in slide-in-from-bottom-4 duration-300 min-w-[340px] max-w-[500px]',
      state.phase === 'running' && 'border-blue-200',
      state.phase === 'done'    && 'border-emerald-200',
      state.phase === 'error'   && 'border-red-200',
    )}>
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
          state.phase === 'running' && 'bg-blue-50',
          state.phase === 'done'    && 'bg-emerald-50',
          state.phase === 'error'   && 'bg-red-50',
        )}>
          {state.phase === 'running' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          {state.phase === 'done'    && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {state.phase === 'error'   && <AlertCircle className="w-4 h-4 text-red-500" />}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Zap className={cn('w-3 h-3',
              state.phase === 'running' && 'text-blue-500',
              state.phase === 'done'    && 'text-emerald-500',
              state.phase === 'error'   && 'text-red-500',
            )} />
            <span className={cn('text-xs font-bold',
              state.phase === 'running' && 'text-blue-700',
              state.phase === 'done'    && 'text-emerald-700',
              state.phase === 'error'   && 'text-red-700',
            )}>
              {state.phase === 'running' && 'Lumina Agent Running'}
              {state.phase === 'done'    && `Done — ${state.found} discrepanc${state.found === 1 ? 'y' : 'ies'} found`}
              {state.phase === 'error'   && 'Agent Error'}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5 max-w-[360px]">{state.currentStep}</p>

          {/* Step progress bar */}
          {state.phase === 'running' && state.steps.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {state.steps.slice(-5).map((_, i, arr) => (
                <div key={i} className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  i === arr.length - 1 ? 'flex-[2] bg-blue-400' : 'flex-1 bg-slate-200'
                )} />
              ))}
            </div>
          )}
        </div>

        {/* Found badge */}
        {state.phase === 'done' && state.found > 0 && (
          <span className="flex-shrink-0 text-[11px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
            +{state.found}
          </span>
        )}
      </div>
    </div>
  )
}