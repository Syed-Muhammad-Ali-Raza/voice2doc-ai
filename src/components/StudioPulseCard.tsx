import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  CheckSquare,
  FileText,
  Mic,
  RefreshCw,
  Sparkles,
  Waves,
} from 'lucide-react'
import { GlassCard } from './GlassCard'
import { useT } from '../i18n/useT'
import { pulseService, type PulseBrief, type PulseItem } from '../services/pulseService'
import { useEffect, useState } from 'react'
import { useDocsStore } from '../store/docs'

function kindIcon(kind: PulseItem['kind']) {
  switch (kind) {
    case 'action':
      return CheckSquare
    case 'echo':
      return Waves
    case 'thread':
      return Sparkles
    case 'voice':
      return Mic
    default:
      return FileText
  }
}

function kindLabel(t: (k: string) => string, kind: PulseItem['kind']) {
  switch (kind) {
    case 'action':
      return t('pulse.kind.action')
    case 'echo':
      return t('pulse.kind.echo')
    case 'thread':
      return t('pulse.kind.thread')
    case 'voice':
      return t('pulse.kind.voice')
    default:
      return t('pulse.kind.doc')
  }
}

interface StudioPulseCardProps {
  compact?: boolean
}

export function StudioPulseCard({ compact = false }: StudioPulseCardProps) {
  const t = useT()
  const showToast = useDocsStore((s) => s.showToast)
  const [brief, setBrief] = useState<PulseBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const data = await pulseService.get()
      setBrief(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pulse.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    try {
      const data = await pulseService.refresh()
      setBrief(data)
      showToast(t('pulse.refreshed'))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pulse.refreshFailed'))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <GlassCard className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="text-accent" size={20} />
          <h2 className="font-display text-xl font-semibold text-ink dark:text-dark-ink">
            {t('pulse.title')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-sm"
            onClick={() => void refresh()}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`inline mr-1 ${refreshing ? 'animate-spin' : ''}`} size={14} />
            {t('pulse.refresh')}
          </button>
          {!compact && (
            <Link to="/app/pulse" className="text-sm text-accent hover:underline">
              {t('pulse.viewAll')}
            </Link>
          )}
        </div>
      </div>

      {loading && <p className="text-sm text-muted">{t('common.loading')}</p>}

      {!loading && brief && (
        <>
          <div>
            <p className="font-medium text-ink dark:text-dark-ink">{brief.headline}</p>
            <p className="mt-1 text-sm text-muted">{brief.summary}</p>
          </div>

          {!compact && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatPill label={t('pulse.stats.docsWeek')} value={brief.stats.docsUpdatedWeek} />
              <StatPill label={t('pulse.stats.threads')} value={brief.stats.openThreads} />
              <StatPill label={t('pulse.stats.actions')} value={brief.stats.openActions} />
              <StatPill label={t('pulse.stats.lowEcho')} value={brief.stats.lowEchoCount} />
              <StatPill label={t('pulse.stats.voiceWeek')} value={brief.stats.voiceCommandsWeek} />
            </div>
          )}

          <ul className="divide-y divide-border dark:divide-dark-border">
            {brief.focusItems.slice(0, compact ? 3 : 6).map((item) => {
              const Icon = kindIcon(item.kind)
              const inner = (
                <>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Icon className="mt-0.5 shrink-0 text-accent" size={16} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink dark:text-dark-ink">{item.title}</p>
                      {item.detail && <p className="truncate text-xs text-muted">{item.detail}</p>}
                      <p className="text-xs text-muted/80">{kindLabel(t, item.kind)}</p>
                    </div>
                  </div>
                  {item.href && <ArrowRight className="shrink-0 text-muted" size={16} />}
                </>
              )
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link to={item.href} className="flex items-center justify-between gap-3 py-3">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3 py-3">{inner}</div>
                  )}
                </li>
              )
            })}
            {brief.focusItems.length === 0 && (
              <li className="py-4 text-sm text-muted">{t('pulse.empty')}</li>
            )}
          </ul>

          {compact && (
            <Link to="/app/pulse" className="btn-secondary w-full text-center">
              {t('pulse.openStudio')}
            </Link>
          )}
        </>
      )}
    </GlassCard>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-black/5 px-3 py-2 dark:bg-white/5">
      <p className="text-lg font-semibold text-ink dark:text-dark-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}
