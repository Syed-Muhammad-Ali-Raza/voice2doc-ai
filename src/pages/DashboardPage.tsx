import { Link, useNavigate } from 'react-router-dom'
import { FilePlus2, Mic, Upload } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { StudioPulseCard } from '../components/StudioPulseCard'
import { FREE_DOCUMENT_LIMIT, trialsRemaining } from '../lib/trials'
import { useAuthStore, useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const documents = useDocsStore((s) => s.documents)
  const usage = useDocsStore((s) => s.usage)
  const createBlank = useDocsStore((s) => s.createBlank)
  const plan = useSettingsStore((s) => s.plan)
  const navigate = useNavigate()
  const recent = [...documents].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 5)
  const minutesPct = Math.min(100, Math.round((usage.minutesUsed / usage.minutesLimit) * 100))
  const storagePct = Math.min(100, Math.round((usage.storageUsedMb / usage.storageLimitMb) * 100))
  const remaining = trialsRemaining(plan, usage.trialsUsed)
  const trialsPct =
    remaining === null ? 100 : Math.min(100, Math.round((usage.trialsUsed / FREE_DOCUMENT_LIMIT) * 100))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">
          Welcome back, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-muted">Your studio is ready. Capture something, or continue a draft.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/app/record" className="glass p-5 transition hover:ring-1 hover:ring-accent/30">
          <Mic className="text-accent" />
          <h2 className="mt-3 font-semibold text-ink dark:text-dark-ink">Record Audio</h2>
          <p className="mt-1 text-sm text-muted">Capture with live waveform.</p>
        </Link>
        <Link to="/app/upload" className="glass p-5 transition hover:ring-1 hover:ring-accent/30">
          <Upload className="text-accent" />
          <h2 className="mt-3 font-semibold text-ink dark:text-dark-ink">Upload Audio</h2>
          <p className="mt-1 text-sm text-muted">MP3, WAV, M4A, AAC, FLAC.</p>
        </Link>
        <button
          type="button"
          className="glass p-5 text-left transition hover:ring-1 hover:ring-accent/30"
          onClick={() => {
            const doc = createBlank()
            navigate(`/app/editor/${doc.id}`)
          }}
        >
          <FilePlus2 className="text-accent" />
          <h2 className="mt-3 font-semibold text-ink dark:text-dark-ink">Create Blank Document</h2>
          <p className="mt-1 text-sm text-muted">Start writing from scratch.</p>
        </button>
      </div>

      <StudioPulseCard compact />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink dark:text-dark-ink">Recent documents</h2>
            <Link to="/app/documents" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border dark:divide-dark-border">
            {recent.map((doc) => (
              <li key={doc.id}>
                <Link to={`/app/editor/${doc.id}`} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-ink dark:text-dark-ink">{doc.title}</p>
                    <p className="text-xs text-muted">
                      {doc.type} · {new Date(doc.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  {doc.favorite && <span className="text-accent">★</span>}
                </Link>
              </li>
            ))}
            {recent.length === 0 && <li className="py-6 text-sm text-muted">No documents yet.</li>}
          </ul>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <h2 className="font-semibold text-ink dark:text-dark-ink">Free AI documents</h2>
            {remaining === null ? (
              <p className="mt-2 text-sm text-signal">Unlimited on {plan} plan</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted">
                  {usage.trialsUsed} / {FREE_DOCUMENT_LIMIT} used · {remaining} left
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full ${remaining === 0 ? 'bg-danger' : 'bg-accent'}`}
                    style={{ width: `${trialsPct}%` }}
                  />
                </div>
                {remaining === 0 && (
                  <Link to="/app/billing" className="btn-primary mt-4 w-full">
                    Upgrade for unlimited
                  </Link>
                )}
              </>
            )}
          </GlassCard>
          <GlassCard className="p-5">
            <h2 className="font-semibold text-ink dark:text-dark-ink">AI usage</h2>
            <p className="mt-2 text-sm text-muted">
              {usage.minutesUsed} / {usage.minutesLimit} minutes
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-full rounded-full bg-accent" style={{ width: `${minutesPct}%` }} />
            </div>
            <p className="mt-4 text-sm text-muted">{usage.docsCreated} documents created</p>
          </GlassCard>
          <GlassCard className="p-5">
            <h2 className="font-semibold text-ink dark:text-dark-ink">Storage</h2>
            <p className="mt-2 text-sm text-muted">
              {usage.storageUsedMb} / {usage.storageLimitMb} MB
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-full rounded-full bg-signal" style={{ width: `${storagePct}%` }} />
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <h2 className="font-semibold text-ink dark:text-dark-ink">Subscription</h2>
            <p className="mt-2 capitalize text-accent">{plan} plan</p>
            <Link to="/app/billing" className="btn-secondary mt-4 w-full">
              Manage billing
            </Link>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
