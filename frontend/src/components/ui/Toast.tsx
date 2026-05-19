'use client'
import { useEffect } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error'

interface ToastProps {
  message: string
  variant?: ToastVariant
  onClose: () => void
  durationMs?: number
}

export function Toast({ message, variant = 'success', onClose, durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs)
    return () => clearTimeout(timer)
  }, [onClose, durationMs])

  const isSuccess = variant === 'success'

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-[100] flex items-start gap-3 px-4 py-3.5',
        'rounded-xl border shadow-2xl backdrop-blur-sm max-w-sm',
        isSuccess
          ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
          : 'bg-red-500/10 border-red-500/30 text-red-400',
      )}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      )}
      <p className="text-sm flex-1 leading-snug">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
