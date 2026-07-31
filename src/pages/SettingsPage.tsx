import { Link } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { LOCALES, type LocaleCode } from '../i18n'
import { useT } from '../i18n/useT'
import { ACCENT_PALETTES, type AccentId } from '../theme/palettes'
import { TYPOGRAPHY_PAIRS, type TypographyId } from '../theme/typography'
import { useSettingsStore } from '../store/auth'

export function SettingsPage() {
  const t = useT()
  const {
    darkMode,
    toggleDarkMode,
    locale,
    setLocale,
    accentId,
    setAccentId,
    typographyId,
    setTypographyId,
    resetAppearance,
    notifications,
    setNotifications,
    autoSave,
    setAutoSave,
    privacyAnalytics,
    setPrivacyAnalytics,
    plan,
  } = useSettingsStore()

  const typePair = TYPOGRAPHY_PAIRS.find((p) => p.id === typographyId) ?? TYPOGRAPHY_PAIRS[0]!

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">{t('settings.title')}</h1>
        <p className="mt-1 text-muted">{t('settings.subtitle')}</p>
      </div>

      <GlassCard className="space-y-5 p-5">
        <div>
          <h2 className="font-semibold text-ink dark:text-dark-ink">{t('settings.appearanceTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('settings.appearanceCopy')}</p>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-ink dark:text-dark-ink">{t('settings.accentColor')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACCENT_PALETTES.map((p) => {
              const selected = accentId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAccentId(p.id as AccentId)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                      : 'border-border hover:bg-black/5 dark:border-dark-border dark:hover:bg-white/5'
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full shadow-inner">
                    <span className="h-full w-1/2" style={{ background: p.accent }} />
                    <span className="h-full w-1/2" style={{ background: p.signal }} />
                  </span>
                  <span className="text-sm font-medium text-ink dark:text-dark-ink">{t(p.labelKey)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-ink dark:text-dark-ink">{t('settings.typography')}</p>
          <div className="grid gap-2">
            {TYPOGRAPHY_PAIRS.map((pair) => {
              const selected = typographyId === pair.id
              return (
                <button
                  key={pair.id}
                  type="button"
                  onClick={() => setTypographyId(pair.id as TypographyId)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    selected
                      ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                      : 'border-border hover:bg-black/5 dark:border-dark-border dark:hover:bg-white/5'
                  }`}
                >
                  <p className="text-lg font-semibold text-ink dark:text-dark-ink" style={{ fontFamily: pair.display }}>
                    {t(pair.labelKey)}
                  </p>
                  <p className="mt-1 text-xs text-muted" style={{ fontFamily: pair.sans }}>
                    {t('settings.displayFont')}: {pair.display.split(',')[0]?.replace(/'/g, '')} ·{' '}
                    {t('settings.bodyFont')}: {pair.sans.split(',')[0]?.replace(/'/g, '')}
                  </p>
                </button>
              )
            })}
          </div>
          <div
            className="mt-4 rounded-xl border border-border/80 bg-white/40 p-4 dark:border-dark-border dark:bg-white/5"
            style={{ fontFamily: typePair.sans }}
          >
            <p className="text-xl font-semibold text-ink dark:text-dark-ink" style={{ fontFamily: typePair.display }}>
              Voice → Document
            </p>
            <p className="mt-1 text-sm text-muted">
              The quick brown fox jumps over the lazy studio — live typography preview.
            </p>
          </div>
        </div>

        <button type="button" className="btn-ghost text-sm" onClick={resetAppearance}>
          {t('settings.resetAppearance')}
        </button>
      </GlassCard>

      <GlassCard className="divide-y divide-border dark:divide-dark-border">
        <ToggleRow
          label={t('settings.darkMode')}
          description={t('settings.darkModeDesc')}
          checked={darkMode}
          onChange={toggleDarkMode}
        />
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium text-ink dark:text-dark-ink">{t('settings.language')}</p>
            <p className="text-sm text-muted">{t('settings.languageDesc')}</p>
          </div>
          <select
            className="input-field w-44"
            value={locale}
            onChange={(e) => setLocale(e.target.value as LocaleCode)}
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeLabel} ({l.label})
              </option>
            ))}
          </select>
        </div>
        <ToggleRow
          label={t('settings.notifications')}
          description={t('settings.notificationsDesc')}
          checked={notifications}
          onChange={() => setNotifications(!notifications)}
        />
        <ToggleRow
          label={t('settings.autoSave')}
          description={t('settings.autoSaveDesc')}
          checked={autoSave}
          onChange={() => setAutoSave(!autoSave)}
        />
        <ToggleRow
          label={t('settings.privacyAnalytics')}
          description={t('settings.privacyAnalyticsDesc')}
          checked={privacyAnalytics}
          onChange={() => setPrivacyAnalytics(!privacyAnalytics)}
        />
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <h2 className="font-semibold text-ink dark:text-dark-ink">{t('settings.connectedTitle')}</h2>
        <p className="text-sm text-muted">{t('settings.connectedCopy')}</p>
        <Link to="/app/integrations" className="btn-primary w-full">
          {t('settings.openIntegrations')}
        </Link>
      </GlassCard>

      <GlassCard className="flex items-center justify-between p-5">
        <div>
          <p className="font-medium text-ink dark:text-dark-ink">{t('settings.subscription')}</p>
          <p className="text-sm capitalize text-muted">
            {plan} {t('settings.planSuffix')}
          </p>
        </div>
        <Link to="/app/billing" className="btn-primary">
          {t('common.manage')}
        </Link>
      </GlassCard>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="font-medium text-ink dark:text-dark-ink">{label}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-accent' : 'bg-black/15 dark:bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}
