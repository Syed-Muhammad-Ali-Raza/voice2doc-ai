import { Link } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { useT } from '../i18n/useT'

const SECTIONS = ['collect', 'use', 'audio', 'integrations', 'retention', 'rights', 'contact'] as const

export function PrivacyPolicyPage() {
  const t = useT()

  return (
    <div className="page-enter mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="text-sm font-medium text-accent">{t('privacy.updated')}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink dark:text-dark-ink">{t('privacy.title')}</h1>
      <p className="mt-4 text-muted">{t('privacy.intro')}</p>

      <div className="mt-10 space-y-4">
        {SECTIONS.map((id) => (
          <GlassCard key={id} className="space-y-2 p-6">
            <h2 className="font-display text-xl font-semibold text-ink dark:text-dark-ink">
              {t(`privacy.${id}Title`)}
            </h2>
            <p className="text-sm leading-relaxed text-muted">{t(`privacy.${id}Body`)}</p>
          </GlassCard>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted">
        {t('privacy.helpCue')}{' '}
        <Link to="/help" className="text-accent hover:underline">
          {t('nav.help')}
        </Link>
        {' · '}
        <Link to="/contact" className="text-accent hover:underline">
          {t('nav.contact')}
        </Link>
      </p>
    </div>
  )
}
