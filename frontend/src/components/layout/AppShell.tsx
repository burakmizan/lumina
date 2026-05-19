'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  AlertTriangle,
  Search,
  Bell,
  Plug,
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard',           href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Counterparties',      href: '/counterparties',   icon: Users },
  { label: 'Reconciliation List', href: '/reconciliations',  icon: FileSpreadsheet },
  { label: 'Discrepancies',       href: '/discrepancies',    icon: AlertTriangle },
  { label: 'Integrations',        href: '/integrations',     icon: Plug },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 flex flex-col">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center flex-shrink-0 h-10 w-32 relative">
            <Image 
              src="/lumina.png" 
              alt="Lumina Logo" 
              fill
              className="object-contain object-left"
              priority
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center ml-1">
              <span className="text-sm font-bold text-emerald-700">A</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
