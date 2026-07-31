import { useEffect, useState } from 'react'
import { Brain, CheckCircle2, Link2, Users } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { useT } from '../i18n/useT'
import {
  memoryService,
  type MemoryMeetingSummary,
  type MemoryThreadDetail,
  type MemoryThreadSummary,
} from '../services/memoryService'
import { useDocsStore } from '../store/docs'

export function MemoryPage() {
  const t = useT()
  const showToast = useDocsStore((s) => s.showToast)
  const [threads, setThreads] = useState<MemoryThreadSummary[]>([])
  const [meetings, setMeetings] = useState<MemoryMeetingSummary[]>([])
  const [selected, setSelected] = useState<MemoryThreadDetail | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true)
    try {
      const [tRes, mRes] = await Promise.all([memoryService.listThreads(), memoryService.listMeetings()])
      setThreads(tRes.threads)
      setMeetings(mRes.meetings)
      if (tRes.threads[0]) {
        const detail = await memoryService.getThread(tRes.threads[0].id)
        setSelected(detail)
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load memory')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">{t('memory.title')}</h1>
        <p className="mt-1 text-muted">{t('memory.subtitle')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <GlassCard className="flex items-center gap-3 p-4">
          <Brain className="text-accent" size={20} />
          <div>
            <p className="text-2xl font-semibold text-ink dark:text-dark-ink">{threads.length}</p>
            <p className="text-xs text-muted">{t('memory.statThreads')}</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-4">
          <Link2 className="text-accent" size={20} />
          <div>
            <p className="text-2xl font-semibold text-ink dark:text-dark-ink">
              {threads.filter((x) => x.recurring).length}
            </p>
            <p className="text-xs text-muted">{t('memory.statRecurring')}</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-4">
          <Users className="text-accent" size={20} />
          <div>
            <p className="text-2xl font-semibold text-ink dark:text-dark-ink">{meetings.length}</p>
            <p className="text-xs text-muted">{t('memory.statMeetings')}</p>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="font-semibold text-ink dark:text-dark-ink">{t('memory.threadsTitle')}</h2>
          {busy && threads.length === 0 ? (
            <p className="text-sm text-muted">{t('common.loading')}</p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={async () => {
                  try {
                    setSelected(await memoryService.getThread(thread.id))
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Failed to open thread')
                  }
                }}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selected?.id === thread.id
                    ? 'border-accent bg-accent/10 ring-2 ring-accent/25'
                    : 'border-border hover:bg-black/5 dark:border-dark-border dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                    {thread.kind}
                  </span>
                  {thread.recurring && (
                    <span className="text-[11px] font-medium text-signal">{t('memory.recurring')}</span>
                  )}
                </div>
                <p className="mt-2 font-medium text-ink dark:text-dark-ink">{thread.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {thread.meetingCount} {t('memory.meetingsLabel')} · {thread.openActions}{' '}
                  {t('memory.actionsLabel')}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <GlassCard className="space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">{selected.kind}</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-ink dark:text-dark-ink">
                    {selected.title}
                  </h2>
                  {selected.recurring && (
                    <p className="mt-2 text-sm text-signal">{t('memory.recurringHint')}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    const next = selected.status === 'open' ? 'closed' : 'open'
                    try {
                      const updated = await memoryService.setStatus(selected.id, next)
                      setSelected(updated)
                      setThreads((prev) =>
                        prev.map((x) => (x.id === updated.id ? { ...x, status: updated.status } : x)),
                      )
                      showToast(next === 'closed' ? t('memory.closedToast') : t('memory.reopenedToast'))
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : 'Update failed')
                    }
                  }}
                >
                  <CheckCircle2 size={16} />
                  {selected.status === 'open' ? t('memory.closeThread') : t('memory.reopenThread')}
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink dark:text-dark-ink">{t('memory.linkedMeetings')}</h3>
                <ul className="mt-2 space-y-2">
                  {selected.meetings.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-xl border border-border/80 px-3 py-2 text-sm dark:border-dark-border"
                    >
                      <p className="font-medium text-ink dark:text-dark-ink">{m.title}</p>
                      <p className="text-xs text-muted">
                        {m.sourceProvider?.replaceAll('_', ' ') || 'meeting'} ·{' '}
                        {new Date(m.meetingAt).toLocaleDateString()}
                        {m.note ? ` · ${m.note}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink dark:text-dark-ink">{t('memory.actionsTitle')}</h3>
                {selected.actions.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">{t('memory.noActions')}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {selected.actions.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-border/80 px-3 py-2 text-sm dark:border-dark-border"
                      >
                        <p className="text-ink dark:text-dark-ink">{a.text}</p>
                        <p className="text-xs text-muted">
                          {a.ownerLabel || t('memory.unassigned')}
                          {a.dueHint ? ` · ${a.dueHint}` : ''} · {a.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-8 text-sm text-muted">{t('memory.emptyDetail')}</GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}
