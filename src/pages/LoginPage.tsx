import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandWordmark } from '../components/Brand'
import { GlassCard } from '../components/GlassCard'
import { useT } from '../i18n/useT'
import type { PlanId } from '../lib/types'
import { authService } from '../services/authService'
import { useAuthStore, useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'

export function LoginPage() {
  const t = useT()
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
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink dark:text-dark-ink">{t('auth.welcomeBack')}</h1>
        <p className="mt-2 text-sm text-muted">{t('auth.loginCopy')}</p>
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
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email')}
            required
          />
          <input
            className="input-field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.password')}
            required
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-accent hover:underline">
              {t('auth.forgot')}
            </Link>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? t('auth.signingIn') : t('auth.logIn')}
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
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-accent hover:underline">
            {t('auth.createOne')}
          </Link>
        </p>
      </GlassCard>
    </div>
  )
}
