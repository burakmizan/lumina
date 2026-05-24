'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useRef, useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, FileSpreadsheet, AlertTriangle,
  Plug, Settings, LogOut, ChevronDown, ChevronLeft, ChevronRight, User,
  BarChart2, Menu, X as XIcon,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import { GeminiPanel } from '@/components/ui/GeminiPanel'
import { NotificationCenter } from '@/components/ui/NotificationCenter'

const ALL_NAV = [
  { label: 'Dashboard',           href: '/dashboard',        icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Counterparties',      href: '/counterparties',   icon: Users,           permission: 'counterparties.view' },
  { label: 'Reconciliation List', href: '/reconciliations',  icon: FileSpreadsheet, permission: 'reconciliations.view' },
  { label: 'Discrepancies',       href: '/discrepancies',    icon: AlertTriangle,   permission: 'discrepancies.view' },
  { label: 'Integrations',        href: '/integrations',     icon: Plug,            permission: 'erp_integration.view' },
  { label: 'Reports',             href: '/reports',          icon: BarChart2,       permission: 'dashboard.view' },
  { label: 'Company Settings',    href: '/settings',         icon: Settings,        permission: 'settings.view' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)

  function scrollNav(dir: 'left' | 'right') {
    navRef.current?.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' })
  }

  // Filter nav items based on role permissions
  const NAV = ALL_NAV

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

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
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 flex flex-col overflow-x-hidden">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/dashboard" className="flex items-center flex-shrink-0 h-9 w-24 relative">
              <Image
                src="/lumina.png"
                alt="Lumina Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </Link>
          </div>

          {/* Navigation (desktop only) */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-2 overflow-hidden max-w-[900px] px-4">
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
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* User / Settings dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(o => !o)}
                className={cn(
                  'flex items-center gap-2 pl-2 pr-2 sm:pr-3 py-1.5 rounded-xl border transition-colors',
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
                <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform hidden sm:block', settingsOpen && 'rotate-180')} />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                  {user && (
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{user.full_name || user.username}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        {user.role}
                      </span>
                    </div>
                  )}
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
            {/* Shortcuts hint */}
            <kbd className="hidden lg:flex items-center px-2 py-1 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg">
              /
            </kbd>
            {/* Global Search */}
            <GlobalSearch />
            {/* Notifications */}
            <NotificationCenter />
          </div>
        </div>
      </header>

      {/* ── Mobile Nav Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white border-r border-slate-200 shadow-2xl flex flex-col pt-16 overflow-y-auto">
            {user && (
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-emerald-700">{userInitial}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name || user.username}</p>
                    <p className="text-xs text-slate-500 truncate">{user.role}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1 py-2 overflow-y-auto">
              {NAV.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors border-l-2',
                      active
                        ? 'bg-emerald-50 text-emerald-700 border-l-emerald-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-transparent',
                    )}
                  >
                    <Icon className={cn('w-4 h-4 flex-shrink-0', item.icon === Settings && active && 'rotate-90')} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>
      <GeminiPanel />
    </div>
  )
}