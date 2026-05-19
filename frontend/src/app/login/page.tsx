'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError('Invalid username or password.')
        setLoading(false)
      }
    } catch {
      setError('Network error — is the server running?')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
      {/* Subtle radial glow behind card */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 flex items-center justify-center"
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(41,190,152,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-[400px] relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-2xl bg-accent-green/15 border border-accent-green/25 flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Lumina</h1>
            <p className="text-[10px] text-text-secondary uppercase tracking-[0.15em]">
              AI Reconciliation Console
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-secondary border border-surface-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Sign in</h2>
          <p className="text-sm text-text-secondary mb-7">
            Access the reconciliation dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-[11px] font-medium text-text-secondary uppercase tracking-widest mb-2">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full bg-surface-primary border border-surface-border text-white placeholder:text-text-muted rounded-xl px-4 py-3 text-sm outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-medium text-text-secondary uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-surface-primary border border-surface-border text-white placeholder:text-text-muted rounded-xl px-4 py-3 text-sm outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-green hover:bg-accent-green-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo creds */}
          <div className="mt-7 pt-6 border-t border-surface-border">
            <p className="text-[11px] text-text-muted text-center uppercase tracking-widest mb-3">
              Demo credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Username', value: 'admin' },
                { label: 'Password', value: 'lumina2024' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-surface-primary rounded-xl px-4 py-3 border border-surface-border"
                >
                  <p className="text-[10px] text-text-muted mb-0.5">{label}</p>
                  <p className="text-sm text-white font-mono">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Powered by Google Gemini · MongoDB Atlas · MCP
        </p>
      </div>
    </div>
  )
}
