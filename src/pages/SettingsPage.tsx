import { Link } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { useSettingsStore } from '../store/auth'

export function SettingsPage() {
  const {
    darkMode,
    toggleDarkMode,
    language,
    setLanguage,
    notifications,
    setNotifications,
    autoSave,
    setAutoSave,
    privacyAnalytics,
    setPrivacyAnalytics,
    plan,
  } = useSettingsStore()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Settings</h1>
        <p className="mt-1 text-muted">Tune the studio to how you work.</p>
      </div>

      <GlassCard className="divide-y divide-border dark:divide-dark-border">
        <ToggleRow label="Dark mode" description="Charcoal studio surfaces" checked={darkMode} onChange={toggleDarkMode} />
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium text-ink dark:text-dark-ink">Language</p>
            <p className="text-sm text-muted">Interface language</p>
          </div>
          <select className="input-field w-40" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {['English', 'Spanish', 'French', 'German', 'Urdu', 'Arabic'].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <ToggleRow label="Notifications" description="Product updates and processing alerts" checked={notifications} onChange={() => setNotifications(!notifications)} />
        <ToggleRow label="Auto save" description="Save editor changes automatically" checked={autoSave} onChange={() => setAutoSave(!autoSave)} />
        <ToggleRow
          label="Privacy analytics"
          description="Allow anonymous product analytics"
          checked={privacyAnalytics}
          onChange={() => setPrivacyAnalytics(!privacyAnalytics)}
        />
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <h2 className="font-semibold text-ink dark:text-dark-ink">Connected accounts</h2>
        <p className="text-sm text-muted">Manage Zoom, Meet, Teams, Notion, and Google Docs.</p>
        <Link to="/app/integrations" className="btn-primary w-full">
          Open Integrations
        </Link>
      </GlassCard>

      <GlassCard className="flex items-center justify-between p-5">
        <div>
          <p className="font-medium text-ink dark:text-dark-ink">Subscription</p>
          <p className="text-sm capitalize text-muted">{plan} plan</p>
        </div>
        <Link to="/app/billing" className="btn-primary">
          Manage
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
