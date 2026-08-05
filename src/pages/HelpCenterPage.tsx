import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LifeBuoy, Mail, Mic, Plug, Settings2 } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { useT } from '../i18n/useT'

const FAQ_IDS = ['start', 'record', 'language', 'theme', 'integrations', 'billing', 'privacy', 'chatbot', 'echo'] as const

const TOPICS = [
  { id: 'gettingStarted', to: '/register', icon: LifeBuoy },
  { id: 'recording', to: '/features', icon: Mic },
  { id: 'studio', to: '/login', icon: Settings2 },
  { id: 'connect', to: '/contact', icon: Plug },
] as const

export function HelpCenterPage() {
  const t = useT()
  const [open, setOpen] = useState<string | null>('start')

  return (
    <div className="page-enter mx-auto max-w-3xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink dark:text-dark-ink">{t('help.title')}</h1>
      <p className="mt-4 text-muted">{t('help.intro')}</p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {TOPICS.map((topic) => (
          <Link key={topic.id} to={topic.to}>
            <GlassCard className="flex h-full items-start gap-3 p-5 transition hover:bg-accent/5">
              <topic.icon className="mt-0.5 shrink-0 text-accent" size={20} />
              <div>
                <p className="font-semibold text-ink dark:text-dark-ink">{t(`help.topic.${topic.id}Title`)}</p>
                <p className="mt-1 text-sm text-muted">{t(`help.topic.${topic.id}Body`)}</p>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl font-semibold text-ink dark:text-dark-ink">{t('help.faqTitle')}</h2>
      <div className="mt-4 space-y-2">
        {FAQ_IDS.map((id) => {
          const isOpen = open === id
          return (
            <GlassCard key={id} className="overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : id)}
              >
                <span className="font-medium text-ink dark:text-dark-ink">{t(`help.faq.${id}Q`)}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-muted transition ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && <p className="border-t border-border px-5 py-4 text-sm text-muted dark:border-dark-border">{t(`help.faq.${id}A`)}</p>}
            </GlassCard>
          )
        })}
      </div>

      <GlassCard className="mt-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 text-accent" size={20} />
          <div>
            <p className="font-semibold text-ink dark:text-dark-ink">{t('help.stillTitle')}</p>
            <p className="mt-1 text-sm text-muted">{t('help.stillBody')}</p>
          </div>
        </div>
        <Link to="/contact" className="btn-primary shrink-0">
          {t('nav.contact')}
        </Link>
      </GlassCard>
    </div>
  )
}
