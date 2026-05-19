'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { LayoutDashboard, AlertTriangle, LogOut, Zap, Building2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',       label: 'Dashboard',      Icon: LayoutDashboard },
  { href: '/counterparties',  label: 'Counterparties', Icon: Users },
  { href: '/discrepancies',   label: 'Discrepancies',  Icon: AlertTriangle },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-[220px] h-[calc(100vh-1.5rem)] m-3 rounded-3xl bg-[#F7F7F7] border border-gray-200/50 flex-shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center px-5 py-6 h-14 relative w-full mt-4">
        <Image 
          src="/lumina.png" 
          alt="Lumina Logo" 
          fill
          className="object-contain object-left"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 py-2 text-[10px] font-medium text-text-muted uppercase tracking-widest mb-2">
          Menu
        </p>
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              pathname === href
                ? 'bg-accent-green/10 text-accent-green'
                : 'text-text-secondary hover:text-gray-900 hover:bg-white',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Status indicator */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200/50">
          <Building2 className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <p className="text-[11px] text-text-secondary">Agent monitoring</p>
          <span className="ml-auto flex-shrink-0 relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-green" />
          </span>
        </div>
      </div>

      {/* Footer / user */}
      <div className="px-3 pb-4 border-t border-surface-border/50 pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-accent-blue/20 border border-accent-blue/25 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-accent-blue">A</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
            <p className="text-[10px] text-text-muted">Lumina Console</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:text-red-400 hover:bg-surface-secondary rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
