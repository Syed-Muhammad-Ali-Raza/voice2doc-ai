import { useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Search,
  Settings,
  Upload,
  User,
  Users,
  X,
  LayoutTemplate,
  Plug,
  Brain,
  Wand2,
} from 'lucide-react'
import { BrandWordmark } from './Brand'
import { Toast } from './Toast'
import { VoiceGuideButton } from './VoiceGuideButton'
import { useT } from '../i18n/useT'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/auth'

export function AppShell() {
  const t = useT()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const nav = [
    { to: '/app', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/app/documents', label: t('nav.documents'), icon: FileText },
    { to: '/app/workspaces', label: t('nav.workspaces'), icon: Users },
    { to: '/app/record', label: t('nav.record'), icon: Mic },
    { to: '/app/upload', label: t('nav.upload'), icon: Upload },
    { to: '/app/templates', label: t('nav.templates'), icon: LayoutTemplate },
    { to: '/app/integrations', label: t('nav.integrations'), icon: Plug },
    { to: '/app/memory', label: t('nav.memory'), icon: Brain },
    { to: '/app/atelier', label: t('nav.atelier'), icon: Wand2 },
    { to: '/app/billing', label: t('nav.billing'), icon: CreditCard },
    { to: '/app/settings', label: t('nav.settings'), icon: Settings },
  ]

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/app/documents?q=${encodeURIComponent(query.trim())}`)
  }

  const side = (
    <aside className="flex h-full w-64 flex-col border-r border-border/70 bg-glass/80 p-4 backdrop-blur-xl dark:border-dark-border dark:bg-dark-glass/80">
      <div className="mb-8 px-1">
        <BrandWordmark to="/app" size="sm" />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/5 dark:hover:text-dark-ink'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        className="btn-ghost mt-4 justify-start text-danger"
        onClick={async () => {
          await authService.logout()
          logout()
          navigate('/')
        }}
      >
        <LogOut size={16} />
        {t('common.signOut')}
      </button>
    </aside>
  )

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:block">{side}</div>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label={t('common.closeMenu')}
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 h-full">{side}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-canvas/75 px-4 py-3 backdrop-blur-xl dark:border-dark-border dark:bg-dark-canvas/75 md:px-6">
          <button
            type="button"
            className="btn-ghost lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={t('common.openMenu')}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <form onSubmit={onSearch} className="relative max-w-md flex-1">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('common.search')}
              className="input-field pl-9"
            />
          </form>
          <button type="button" className="btn-ghost relative" aria-label={t('settings.notifications')}>
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
          </button>
          <Link
            to="/app/profile"
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
              <User size={16} />
            </span>
            <span className="hidden text-sm font-medium sm:block">{user?.name ?? 'User'}</span>
          </Link>
        </header>
        <main className="page-enter flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
      <Toast />
      <VoiceGuideButton />
    </div>
  )
}
