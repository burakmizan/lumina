'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

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
    <div className="min-h-screen w-full flex bg-white">
      {/* Left Side: Login Form */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 sm:px-12 py-10 z-10 bg-white shadow-[10px_0_30px_-15px_rgba(0,0,0,0.1)] relative">
        
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12">
          <img src="/lumina.png" alt="Lumina Logo" className="h-11 w-auto object-contain" />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Log in to your account</h2>
          <p className="text-sm text-slate-500">
            Enter your credentials to access the AI Reconciliation Console.
          </p>
        </div>

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
              className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#29BE98] focus:ring-1 focus:ring-[#29BE98] transition-all"
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
                className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#29BE98] focus:ring-1 focus:ring-[#29BE98] transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
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
          <div className="mt-7 pt-6 border-t border-slate-200">
            <p className="text-[11px] text-slate-500 text-center uppercase tracking-widest mb-3">
              Demo credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Username', value: 'admin' },
                { label: 'Password', value: 'lumina2026' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200"
                >
                  <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                  <p className="text-sm text-slate-900 font-mono font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        
        <p className="text-center text-xs text-slate-400 mt-auto pt-6">
          Powered by Google Gemini · MongoDB Atlas · MCP
        </p>
      </div>

      {/* Right Side: Visual Banner */}
      <div className="hidden lg:flex flex-1 relative bg-[#0C1F30] overflow-hidden items-center justify-center">
        <img 
          src="/login-bg.jpg"
          alt="Lumina Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        
        <div className="relative z-10 max-w-2xl px-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-white/90 mb-6 leading-tight whitespace-nowrap drop-shadow-[0_0_30px_rgba(16,185,129,0.65)]">
  Reconciliation Reinvented.
</h1>
        </div>
      </div>
    </div>
  )
}
