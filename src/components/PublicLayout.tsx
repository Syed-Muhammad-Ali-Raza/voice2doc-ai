import { Link, NavLink, Outlet } from 'react-router-dom'
import { BrandWordmark } from './Brand'
import { Toast } from './Toast'
import { LOCALES, type LocaleCode } from '../i18n'
import { useT } from '../i18n/useT'
import { useSettingsStore } from '../store/auth'

export function PublicLayout() {
  const t = useT()
  const locale = useSettingsStore((s) => s.locale)
  const setLocale = useSettingsStore((s) => s.setLocale)
  const links = [
    { to: '/features', label: t('nav.features') },
    { to: '/pricing', label: t('nav.pricing') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
  ]

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-canvas/70 backdrop-blur-xl dark:border-dark-border dark:bg-dark-canvas/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <BrandWordmark />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:text-ink dark:hover:text-dark-ink'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="public-locale">
              {t('settings.language')}
            </label>
            <select
              id="public-locale"
              className="input-field hidden w-auto py-2 text-sm sm:block"
              value={locale}
              onChange={(e) => setLocale(e.target.value as LocaleCode)}
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeLabel}
                </option>
              ))}
            </select>
            <Link to="/login" className="btn-ghost hidden sm:inline-flex">
              {t('nav.login')}
            </Link>
            <Link to="/register" className="btn-primary">
              {t('nav.getStarted')}
            </Link>
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="mt-20 border-t border-border/80 dark:border-dark-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
          <div className="md:col-span-2">
            <BrandWordmark size="sm" />
            <p className="mt-3 max-w-sm text-sm text-muted">{t('footer.tagline')}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-dark-ink">{t('nav.product')}</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <Link to="/features">{t('nav.features')}</Link>
              <Link to="/pricing">{t('nav.pricing')}</Link>
              <Link to="/register">{t('nav.templates')}</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-dark-ink">{t('nav.company')}</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <Link to="/about">{t('nav.about')}</Link>
              <Link to="/contact">{t('nav.contact')}</Link>
              <Link to="/privacy">{t('nav.privacy')}</Link>
              <span>{t('nav.terms')}</span>
              <Link to="/help">{t('nav.help')}</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60 py-4 text-center text-xs text-muted dark:border-dark-border">
          © {new Date().getFullYear()} {t('footer.copyright')}
        </div>
      </footer>
      <Toast />
    </div>
  )
}
