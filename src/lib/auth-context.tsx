import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { resolveLoginEmail, recordFailedLogin, recordAuditLog } from './bridge'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const GENERIC_ERROR = 'Incorrect email/ID or password'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(identifier: string, password: string): Promise<{ error?: string }> {
    const resolved = await resolveLoginEmail(identifier)
    if ('error' in resolved) {
      await recordFailedLogin(identifier)
      return { error: GENERIC_ERROR }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: resolved.email, password })
    if (error) {
      await recordFailedLogin(identifier)
      if (error.message.toLowerCase().includes('banned')) {
        return { error: 'This account has been deactivated.' }
      }
      return { error: GENERIC_ERROR }
    }

    const role = data.user.user_metadata?.role as string | undefined
    if (role && role !== 'student') {
      await supabase.auth.signOut()
      return { error: 'This app is for students. Please use the web app to sign in.' }
    }

    if (data.session) {
      await recordAuditLog(data.session.access_token, { action: 'auth.login', description: 'logged in' })
    }

    return {}
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
