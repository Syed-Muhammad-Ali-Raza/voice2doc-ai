import { useState } from 'react'
import { GlassCard } from '../components/GlassCard'
import { useAuthStore } from '../store/auth'
import { useDocsStore } from '../store/docs'
import { useSettingsStore } from '../store/auth'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const plan = useSettingsStore((s) => s.plan)
  const showToast = useDocsStore((s) => s.showToast)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Profile</h1>
        <p className="mt-1 text-muted">Manage how you appear in Voice2Doc.</p>
      </div>
      <GlassCard className="space-y-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 font-display text-2xl text-accent">
          {(name || 'U').charAt(0).toUpperCase()}
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">Name</span>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">Email</span>
          <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <p className="text-sm text-muted">
          Plan: <span className="capitalize text-accent">{plan}</span>
        </p>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => {
            updateProfile({ name, email })
            showToast('Profile updated')
          }}
        >
          Save changes
        </button>
      </GlassCard>
    </div>
  )
}
