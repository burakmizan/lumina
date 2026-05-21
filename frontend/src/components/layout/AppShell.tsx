'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useRef, useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, FileSpreadsheet, AlertTriangle,
  Bell, Plug, Settings, LogOut, ChevronDown, ChevronLeft, ChevronRight, User,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { AgentIsland } from '@/components/ui/AgentIsland'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import { GeminiPanel } from '@/components/ui/GeminiPanel'

const ALL_NAV = [
  { label: 'Dashboard',           href: '/dashboard',        icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Counterparties',      href: '/counterparties',   icon: Users,           permission: 'counterparties.view' },
  { label: 'Reconciliation List', href: '/reconciliations',  icon: FileSpreadsheet, permission: 'reconciliations.view' },
  { label: 'Discrepancies',       href: '/discrepancies',    icon: AlertTriangle,   permission: 'discrepancies.view' },
  { label: 'Integrations',        href: '/integrations',     icon: Plug,            permission: 'erp_integration.view' },
  { label: 'Company Settings',    href: '/settings',         icon: Settings,        permission: 'settings.view' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)

  function scrollNav(dir: 'left' | 'right') {
    navRef.current?.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' })
  }

  // Filter nav items based on role permissions
  const NAV = ALL_NAV

  // Close settings dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const canViewSettings = hasPermission('settings.view') || hasPermission('settings.edit')
  const userInitial = (user?.full_name || user?.username || 'U').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 flex flex-col">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="w-full px-6 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center flex-shrink-0 h-10 w-28 relative">
            <Image
              src="/lumina.png"
              alt="Lumina Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center flex-1 min-w-0 justify-center gap-1">
            <button
              onClick={() => scrollNav('left')}
              className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <nav
              ref={navRef}
              className="flex items-center gap-0.5 overflow-x-auto scrollbar-none min-w-0 pt-0.5"
            >
              {NAV.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                    )}
                  >
                    <Icon className={cn('w-4 h-4 transition-transform duration-300', item.icon === Settings && 'group-hover:rotate-90')} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <button
              onClick={() => scrollNav('right')}
              className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 w-44 justify-end ml-auto">
            {/* User / Settings dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(o => !o)}
                className={cn(
                  'flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition-colors',
                  settingsOpen
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-white border-slate-200 hover:bg-slate-50',
                )}
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-700">{userInitial}</span>
                </div>
                {user && (
                  <div className="hidden sm:block text-left leading-tight max-w-[96px]">
                    <p className="text-xs font-medium text-slate-900 truncate">{user.full_name || user.username}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
                  </div>
                )}
                <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', settingsOpen && 'rotate-180')} />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                  {/* User info */}
                  {user && (
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{user.full_name || user.username}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        {user.role}
                      </span>
                    </div>
                  )}

                  {/* Company Settings */}
                  {(canViewSettings || hasPermission('users.view')) && (
                    <Link
                      href="/settings"
                      onClick={() => setSettingsOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Company Settings
                    </Link>
                  )}

                  {/* Profile */}
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <User className="w-4 h-4 text-slate-400" />
                    My Profile
                  </button>

                  <div className="border-t border-slate-100 mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Global Search */}
            <GlobalSearch />
            {/* Notifications */}
            <button className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
      <AgentIsland />
      <GeminiPanel />
    </div>
  )
}