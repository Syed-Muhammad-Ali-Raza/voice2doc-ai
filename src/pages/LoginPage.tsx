import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandWordmark } from '../components/Brand'
import { GlassCard } from '../components/GlassCard'
import type { PlanId } from '../lib/types'
import { authService } from '../services/authService'
import { useAuthStore, useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'

export function LoginPage() {
  const setSession = useAuthStore((s) => s.setSession)
  const setPlan = useSettingsStore((s) => s.setPlan)
  const setTrials = useDocsStore((s) => s.setTrials)
  const showToast = useDocsStore((s) => s.showToast)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/app'
  const [email, setEmail] = useState('demo@voice2doc.ai')
  const [password, setPassword] = useState('demo123')
  const [busy, setBusy] = useState(false)

  const applySession = (session: Awaited<ReturnType<typeof authService.login>>) => {
    setSession(session)
    if (session.user.plan) setPlan(session.user.plan as PlanId)
    if (typeof session.user.trialsUsed === 'number') {
      setTrials(session.user.trialsUsed, session.user.trialsLimit)
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <GlassCard strong className="page-enter w-full max-w-md p-8">
        <BrandWordmark size="sm" />
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink dark:text-dark-ink">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Log in with your Voice2Doc account.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            try {
              const session = await authService.login(email || 'demo@voice2doc.ai', password)
              applySession(session)
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Login failed')
            } finally {
              setBusy(false)
            }
          }}
        >
          <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <button
          type="button"
          className="btn-secondary mt-3 w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const session = await authService.loginWithGoogle()
              applySession(session)
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Google sign-in failed')
            } finally {
              setBusy(false)
            }
          }}
        >
          Continue with Google
        </button>
        <p className="mt-6 text-center text-sm text-muted">
          No account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </GlassCard>
    </div>
  )
}
