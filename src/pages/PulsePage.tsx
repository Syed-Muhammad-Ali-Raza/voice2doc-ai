import { StudioPulseCard } from '../components/StudioPulseCard'
import { useT } from '../i18n/useT'

export function PulsePage() {
  const t = useT()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">
          {t('pulse.pageTitle')}
        </h1>
        <p className="mt-1 text-muted">{t('pulse.pageSubtitle')}</p>
      </div>
      <StudioPulseCard />
    </div>
  )
}
