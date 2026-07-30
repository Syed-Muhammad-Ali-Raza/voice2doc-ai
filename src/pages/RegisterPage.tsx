import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandWordmark } from '../components/Brand'
import { GlassCard } from '../components/GlassCard'
import type { PlanId } from '../lib/types'
import { authService } from '../services/authService'
import { useAuthStore, useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'

export function RegisterPage() {
  const setSession = useAuthStore((s) => s.setSession)
  const setPlan = useSettingsStore((s) => s.setPlan)
  const setTrials = useDocsStore((s) => s.setTrials)
  const showToast = useDocsStore((s) => s.showToast)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <GlassCard strong className="page-enter w-full max-w-md p-8">
        <BrandWordmark size="sm" />
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink dark:text-dark-ink">Create account</h1>
        <p className="mt-2 text-sm text-muted">Password must be at least 6 characters.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            try {
              const session = await authService.register(
                name || 'New User',
                email || 'you@voice2doc.ai',
                password || 'demo123',
              )
              setSession(session)
              if (session.user.plan) setPlan(session.user.plan as PlanId)
              setTrials(session.user.trialsUsed ?? 0, session.user.trialsLimit)
              navigate('/app')
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Sign up failed')
            } finally {
              setBusy(false)
            }
          }}
        >
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6)" required minLength={6} />
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Sign up'}
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
              setSession(session)
              navigate('/app')
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
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </GlassCard>
    </div>
  )
}
