import { useEffect, useState } from 'react'
import { Activity, RefreshCw, Undo2 } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { useT } from '../i18n/useT'
import { scoreBand, type EchoTipId } from '../lib/echoScore'
import { echoService, type EchoScoreRecord } from '../services/echoService'
import { useDocsStore } from '../store/docs'

export function EchoScorePanel({
  documentId,
  draftHtml,
  onRestore,
}: {
  documentId: string
  draftHtml: string
  onRestore: (phrase: string) => void
}) {
  const t = useT()
  const showToast = useDocsStore((s) => s.showToast)
  const [record, setRecord] = useState<EchoScoreRecord | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void echoService.get(documentId).then((next) => {
      if (!cancelled) setRecord(next)
    })
    return () => {
      cancelled = true
    }
  }, [documentId])

  const recompute = async () => {
    setBusy(true)
    try {
      const next = await echoService.recompute(documentId, draftHtml)
      setRecord(next)
      showToast(t('echo.recomputed'))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('echo.recomputeFailed'))
    } finally {
      setBusy(false)
    }
  }

  const tipText = (id: EchoTipId, count?: number) =>
    t(`echo.tip.${id}`, count !== undefined ? { count } : undefined)

  const band = record ? scoreBand(record.score) : 'low'

  return (
    <GlassCard className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-dark-ink">
            <Activity size={16} className="text-accent" />
            {t('echo.title')}
          </div>
          <p className="mt-1 text-xs text-muted">{t('echo.subtitle')}</p>
        </div>
        <button type="button" className="btn-ghost" onClick={() => void recompute()} disabled={busy}>
          <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
          {busy ? t('echo.scoring') : t('echo.recompute')}
        </button>
      </div>

      {!record ? (
        <p className="text-sm text-muted">{t('echo.empty')}</p>
      ) : (
        <>
          <div className="flex items-end gap-4">
            <div>
              <p className="font-display text-4xl font-semibold text-ink dark:text-dark-ink">{record.score}</p>
              <p className="text-xs uppercase tracking-wide text-muted">{t(`echo.band.${band}`)}</p>
            </div>
            <p className="mb-1 text-sm text-muted">
              {t('echo.kept', { kept: record.keptCount, total: record.totalCount })}
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.max(4, record.score)}%` }}
            />
          </div>

          {record.tips.length > 0 && (
            <ul className="space-y-1 text-sm text-ink dark:text-dark-ink">
              {record.tips.map((tip) => (
                <li key={tip.id}>• {tipText(tip.id, tip.count)}</li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('echo.lostTitle')}</p>
            {record.lostPhrases.length === 0 ? (
              <p className="text-sm text-muted">{t('echo.lostEmpty')}</p>
            ) : (
              <ul className="space-y-2">
                {record.lostPhrases.map((phrase) => (
                  <li
                    key={`${phrase.kind}-${phrase.text}`}
                    className="flex items-start justify-between gap-2 rounded-xl bg-black/5 px-3 py-2 dark:bg-white/5"
                  >
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                        {t(`echo.kind.${phrase.kind}`)}
                      </p>
                      <p className="text-sm text-ink dark:text-dark-ink">{phrase.text}</p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost shrink-0"
                      onClick={() => {
                        onRestore(phrase.text)
                        showToast(t('echo.restored'))
                      }}
                    >
                      <Undo2 size={14} />
                      {t('echo.restore')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </GlassCard>
  )
}
