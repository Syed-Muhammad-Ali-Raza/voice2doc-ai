import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandWordmark } from '../components/Brand'
import { GlassCard } from '../components/GlassCard'
import { useDocsStore } from '../store/docs'

export function ForgotPasswordPage() {
  const showToast = useDocsStore((s) => s.showToast)
  const [email, setEmail] = useState('')

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <GlassCard strong className="page-enter w-full max-w-md p-8">
        <BrandWordmark size="sm" />
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink dark:text-dark-ink">Reset password</h1>
        <p className="mt-2 text-sm text-muted">Enter your email and we will send a reset link (demo).</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            showToast('Reset link sent (demo).')
          }}
        >
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <button type="submit" className="btn-primary w-full">
            Send reset link
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          <Link to="/login" className="text-accent hover:underline">
            Back to login
          </Link>
        </p>
      </GlassCard>
    </div>
  )
}
