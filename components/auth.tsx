'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { browserClient } from '@/lib/supabase/browser'

type AuthState = { user: User | null; ready: boolean; error?: string }
const Context = createContext<AuthState>({ user: null, ready: false })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false })
  useEffect(() => {
    const client = browserClient()
    let active = true
    let sessionChanges = 0
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') sessionChanges++
      if (active) setState({ user: session?.user ?? null, ready: true })
    })
    // getUser verifica la sesión al arrancar. Las escrituras de datos además pasan por RLS.
    void client.auth.getUser().then(({ data: { user }, error }) => {
      if (!active || sessionChanges !== 0) return
      if (error?.status === 401 || error?.status === 403) {
        setState({ user: null, ready: true, error: 'Tu sesión ya no es válida. Iniciá sesión nuevamente.' })
      } else if (error && error.name !== 'AuthSessionMissingError') {
        setState((previous) => ({ ...previous, ready: true, error: 'No pudimos comprobar la sesión en este momento. La sincronización se reintentará al recuperar la conexión.' }))
      } else setState({ user, ready: true })
    }).catch(() => {
      if (active && sessionChanges === 0) setState((previous) => ({ ...previous, ready: true, error: 'No pudimos comprobar la sesión en este momento. La sincronización se reintentará al recuperar la conexión.' }))
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])
  return <Context.Provider value={state}>{children}</Context.Provider>
}

export const useAuth = () => useContext(Context)
