import { GlassCard } from '../components/GlassCard'

const items = [
  ['AI Transcription', 'Accurate speech-to-text with grammar cleanup.'],
  ['Document Types', 'Meeting notes, emails, reports, blogs, and more.'],
  ['Tone Control', 'Professional, friendly, formal, casual, or academic.'],
  ['Multilingual', 'Generate in English, Spanish, French, German, Urdu, Arabic.'],
  ['Rich Editor', 'Rewrite, expand, shorten, translate, and export.'],
  ['Templates', 'Start faster with ready-made document structures.'],
]

export function FeaturesPage() {
  return (
    <div className="page-enter mx-auto max-w-6xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink dark:text-dark-ink">Features</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Voice2Doc is designed around one job: turn spoken thoughts into documents you can send.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map(([title, copy]) => (
          <GlassCard key={title} className="p-6">
            <h2 className="font-display text-xl font-semibold text-ink dark:text-dark-ink">{title}</h2>
            <p className="mt-2 text-sm text-muted">{copy}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
