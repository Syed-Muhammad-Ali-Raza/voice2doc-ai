import { useEffect, useState, type ReactNode } from 'react'
import { env } from '../config/env'
import type { PlanId } from '../lib/types'
import { authService } from '../services/authService'
import { billingService } from '../services/billingService'
import { documentService } from '../services/documentService'
import { useAuthStore, useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession)
  const logout = useAuthStore((s) => s.logout)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setPlan = useSettingsStore((s) => s.setPlan)
  const setDocuments = useDocsStore((s) => s.setDocuments)
  const setTrials = useDocsStore((s) => s.setTrials)
  const [ready, setReady] = useState(env.useMockApi)

  useEffect(() => {
    if (env.useMockApi) {
      setReady(true)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const session = await authService.getSession()
        if (cancelled) return
        if (!session) {
          logout()
          setReady(true)
          return
        }
        setSession(session)
        if (session.user.plan) setPlan(session.user.plan)
        if (typeof session.user.trialsUsed === 'number') {
          setTrials(session.user.trialsUsed, session.user.trialsLimit)
        }
        const [docs, entitlements] = await Promise.all([
          documentService.list(),
          billingService.getEntitlements('free', 0),
        ])
        if (cancelled) return
        setDocuments(docs)
        setPlan(entitlements.plan)
        setTrials(entitlements.trialsUsed, entitlements.trialsLimit)
      } catch {
        if (!cancelled) logout()
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [logout, setDocuments, setPlan, setSession, setTrials])

  // When user logs in during session, refresh server data
  useEffect(() => {
    if (env.useMockApi || !isAuthenticated || !ready) return
    let cancelled = false
    ;(async () => {
      try {
        const [docs, entitlements] = await Promise.all([
          documentService.list(),
          billingService.getEntitlements('free', 0),
        ])
        if (cancelled) return
        setDocuments(docs)
        setPlan(entitlements.plan as PlanId)
        setTrials(entitlements.trialsUsed, entitlements.trialsLimit)
      } catch {
        /* ignore refresh errors */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, ready, setDocuments, setPlan, setTrials])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Connecting to Voice2Doc API…
      </div>
    )
  }

  return children
}
