import { Link } from 'react-router-dom'
import { ArrowRight, FileText, Languages, Lock, Mic, Sparkles, Cloud, Download, Wand2 } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { BrandWordmark } from '../components/Brand'
import { Waveform } from '../components/Waveform'
import { PLANS } from '../config/plans'

const features = [
  { icon: Sparkles, title: 'AI Transcription', copy: 'Clear speech-to-text with cleanup built in.' },
  { icon: Mic, title: 'Voice Recording', copy: 'Capture ideas with a studio-grade waveform.' },
  { icon: Wand2, title: 'Smart Formatting', copy: 'Headings, lists, and structure—automatically.' },
  { icon: FileText, title: 'AI Summaries', copy: 'Turn long rambles into crisp documents.' },
  { icon: Languages, title: 'Multiple Languages', copy: 'English, Spanish, French, German, Urdu, Arabic.' },
  { icon: Download, title: 'Export to PDF', copy: 'Share TXT, Markdown, and export-ready stubs.' },
  { icon: Cloud, title: 'Cloud Storage', copy: 'Keep recent drafts ready across sessions.' },
  { icon: Lock, title: 'Secure Data', copy: 'Privacy controls you can toggle anytime.' },
]

export function LandingPage() {
  return (
    <div>
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,123,45,0.14),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-6 md:py-24">
          <div className="page-enter">
            <BrandWordmark size="lg" />
            <h1 className="mt-6 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-ink md:text-5xl dark:text-dark-ink">
              Turn Voice Notes into Professional Documents in Seconds
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted md:text-lg">
              Record or upload audio and let AI instantly create reports, emails, meeting notes, summaries, and more.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary">
                Start Recording <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="btn-secondary">
                Upload Audio
              </Link>
            </div>
          </div>
          <GlassCard strong className="page-enter relative overflow-hidden p-8 md:p-10">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Voice → AI → Document</p>
            <div className="mt-8 space-y-6">
              <div className="rounded-2xl bg-ink/5 p-4 dark:bg-white/5">
                <Waveform active />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="rounded-full bg-accent/15 px-3 py-1 font-medium text-accent">Transcribing</span>
                <span className="text-muted">→</span>
                <span className="rounded-full bg-signal/15 px-3 py-1 font-medium text-signal">Formatted</span>
              </div>
              <div className="rounded-2xl border border-border/80 bg-white/50 p-4 dark:border-dark-border dark:bg-white/5">
                <p className="font-display text-lg font-semibold text-ink dark:text-dark-ink">Meeting Notes</p>
                <p className="mt-2 text-sm text-muted">
                  Decisions locked. Action items assigned. Ready to share.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <h2 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">How it works</h2>
        <p className="mt-2 max-w-xl text-muted">Three steps from spoken thought to polished document.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ['01', 'Record or Upload Audio', 'Capture with your mic or drop an existing file.'],
            ['02', 'AI Transcribes and Understands', 'Cleanup, structure, and tone applied automatically.'],
            ['03', 'Download or Share Your Document', 'Edit, export, and send with confidence.'],
          ].map(([n, t, c]) => (
            <GlassCard key={n} className="p-6">
              <p className="font-display text-3xl text-accent">{n}</p>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink dark:text-dark-ink">{t}</h3>
              <p className="mt-2 text-sm text-muted">{c}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <h2 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Built for clarity</h2>
        <p className="mt-2 text-muted">Everything you need to go from voice to finished draft.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <GlassCard key={f.title} className="p-5">
              <f.icon className="text-accent" size={22} />
              <h3 className="mt-3 font-semibold text-ink dark:text-dark-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.copy}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Simple pricing</h2>
            <p className="mt-2 text-muted">Start free. Upgrade when voice becomes your default draft.</p>
          </div>
          <Link to="/pricing" className="btn-ghost hidden sm:inline-flex">
            Compare plans <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <GlassCard key={p.id} strong={p.highlight} className={`p-6 ${p.highlight ? 'ring-1 ring-accent/40' : ''}`}>
              <h3 className="font-display text-2xl font-semibold text-ink dark:text-dark-ink">{p.name}</h3>
              <p className="mt-3 text-sm text-muted">{p.perks[0]}</p>
              <p className="mt-1 text-sm text-muted">{p.perks[1]}</p>
              <Link to="/register" className={`mt-6 ${p.highlight ? 'btn-primary' : 'btn-secondary'} w-full`}>
                Choose {p.name}
              </Link>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  )
}
