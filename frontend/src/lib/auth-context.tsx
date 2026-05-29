'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '@/types'
import { getCurrentUser, getOnboardingStatus } from '@/lib/api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  hasPermission: (key: string) => boolean
}

// Inline permission map so the context doesn't need an extra API call.
const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  'System Administrator': {
    'dashboard.view': true, 'counterparties.view': true, 'counterparties.manage': true,
    'reconciliations.view': true, 'reconciliations.run': true, 'discrepancies.view': true,
    'discrepancies.approve': true, 'erp_integration.view': true, 'erp_integration.manage': true,
    'settings.view': true, 'settings.edit': true, 'users.view': true, 'users.manage': true,
  },
  'Manager': {
    'dashboard.view': true, 'counterparties.view': true, 'counterparties.manage': true,
    'reconciliations.view': true, 'reconciliations.run': true, 'discrepancies.view': true,
    'discrepancies.approve': true, 'erp_integration.view': false, 'erp_integration.manage': false,
    'settings.view': true, 'settings.edit': false, 'users.view': true, 'users.manage': true,
  },
  'IT Specialist': {
    'dashboard.view': true, 'counterparties.view': true, 'counterparties.manage': false,
    'reconciliations.view': true, 'reconciliations.run': false, 'discrepancies.view': true,
    'discrepancies.approve': false, 'erp_integration.view': true, 'erp_integration.manage': true,
    'settings.view': false, 'settings.edit': false, 'users.view': false, 'users.manage': false,
  },
  'Staff': {
    'dashboard.view': true, 'counterparties.view': true, 'counterparties.manage': false,
    'reconciliations.view': true, 'reconciliations.run': false, 'discrepancies.view': true,
    'discrepancies.approve': false, 'erp_integration.view': false, 'erp_integration.manage': false,
    'settings.view': false, 'settings.edit': false, 'users.view': false, 'users.manage': false,
  },
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  hasPermission: () => false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;

      if (path === '/' || path.startsWith('/login')) {
        setLoading(false);
        return;
      }
    }

    try {
      const u = await getCurrentUser()
      setUser(u)
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/onboarding')
      ) {
        try {
          const status = await getOnboardingStatus()
          if (!status.onboarding_completed) {
            window.location.href = '/onboarding'
            return
          }
        } catch { /* non-fatal */ }
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const hasPermission = useCallback((key: string): boolean => {
    if (!user) return false
    const rolePerms = ROLE_PERMISSIONS[user.role]
    if (rolePerms) return rolePerms[key] ?? false
    // For custom roles, default to false (backend enforces it anyway)
    return false
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
