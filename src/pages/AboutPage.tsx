import { GlassCard } from '../components/GlassCard'

export function AboutPage() {
  return (
    <div className="page-enter mx-auto max-w-3xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink dark:text-dark-ink">About Voice2Doc</h1>
      <GlassCard className="mt-8 space-y-4 p-8 text-muted">
        <p>
          Voice2Doc AI helps students, professionals, journalists, and teams turn raw audio into structured documents—
          without fighting a blank page.
        </p>
        <p>
          This Studio Glass build is a product demo: the flows feel real, while transcription and AI formatting are
          simulated so you can evaluate UX before wiring production APIs.
        </p>
        <p>
          Our design principle is simple: one primary action per screen, calm surfaces, and documents that look ready to
          share.
        </p>
      </GlassCard>
    </div>
  )
}
