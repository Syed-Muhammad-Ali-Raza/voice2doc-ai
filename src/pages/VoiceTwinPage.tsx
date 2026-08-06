import { useEffect, useMemo, useState } from 'react'
import { Fingerprint, Sparkles, Trash2 } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { useT } from '../i18n/useT'
import { voiceTwinService, type VoiceTwin } from '../services/voiceTwinService'
import { useDocsStore } from '../store/docs'

export function VoiceTwinPage() {
  const t = useT()
  const documents = useDocsStore((s) => s.documents)
  const showToast = useDocsStore((s) => s.showToast)
  const [twins, setTwins] = useState<VoiceTwin[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [name, setName] = useState('My Voice Twin')
  const [includeMemory, setIncludeMemory] = useState(true)
  const [busy, setBusy] = useState(false)
  const [activeId, setActiveId] = useState('')

  const active = useMemo(() => twins.find((x) => x.id === activeId) ?? twins[0] ?? null, [twins, activeId])

  const load = async () => {
    try {
      const data = await voiceTwinService.list()
      setTwins(data.twins)
      setActiveId((prev) => prev || data.twins[0]?.id || '')
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('voiceTwin.loadFailed'))
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleDoc = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 8)))
  }

  const train = async () => {
    setBusy(true)
    try {
      const twin = await voiceTwinService.train({
        name,
        documentIds: selectedIds,
        includeMemory,
      })
      setTwins((prev) => [twin, ...prev])
      setActiveId(twin.id)
      showToast(t('voiceTwin.trained'))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('voiceTwin.trainFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">{t('voiceTwin.title')}</h1>
        <p className="mt-1 text-muted">{t('voiceTwin.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Fingerprint className="text-accent" size={18} />
            <h2 className="font-semibold text-ink dark:text-dark-ink">{t('voiceTwin.trainTitle')}</h2>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">{t('voiceTwin.name')}</span>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <div>
            <p className="mb-2 text-sm text-muted">{t('voiceTwin.pickDocs')}</p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border/70 p-2 dark:border-dark-border">
              {documents.length === 0 ? (
                <p className="p-2 text-sm text-muted">{t('voiceTwin.noDocs')}</p>
              ) : (
                documents.slice(0, 20).map((doc) => (
                  <label key={doc.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                    />
                    <span className="truncate text-sm text-ink dark:text-dark-ink">{doc.title}</span>
                  </label>
                ))
              )}
            </div>
            <p className="mt-1 text-xs text-muted">{t('voiceTwin.pickHint')}</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink dark:text-dark-ink">
            <input type="checkbox" checked={includeMemory} onChange={(e) => setIncludeMemory(e.target.checked)} />
            {t('voiceTwin.includeMemory')}
          </label>

          <button type="button" className="btn-primary" disabled={busy} onClick={() => void train()}>
            <Sparkles size={16} />
            {busy ? t('voiceTwin.training') : t('voiceTwin.train')}
          </button>
        </GlassCard>

        <GlassCard className="space-y-4 p-5">
          <h2 className="font-semibold text-ink dark:text-dark-ink">{t('voiceTwin.library')}</h2>
          {twins.length === 0 ? (
            <p className="text-sm text-muted">{t('voiceTwin.empty')}</p>
          ) : (
            <div className="space-y-2">
              {twins.map((twin) => (
                <div
                  key={twin.id}
                  className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left transition ${
                    active?.id === twin.id ? 'bg-accent/15' : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setActiveId(twin.id)}>
                    <p className="font-medium text-ink dark:text-dark-ink">
                      {twin.name} <span className="text-xs text-muted">v{twin.version}</span>
                    </p>
                    <p className="text-xs text-muted">{twin.voiceSummary}</p>
                  </button>
                  <button
                    type="button"
                    className="btn-ghost p-1 text-danger"
                    aria-label={t('voiceTwin.deleted')}
                    onClick={() => {
                      void voiceTwinService
                        .remove(twin.id)
                        .then(() => {
                          setTwins((prev) => prev.filter((x) => x.id !== twin.id))
                          showToast(t('voiceTwin.deleted'))
                        })
                        .catch((err) => showToast(err instanceof Error ? err.message : t('voiceTwin.deleteFailed')))
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {active && (
            <div className="space-y-3 border-t border-border/70 pt-4 dark:border-dark-border">
              <p className="text-sm font-semibold text-ink dark:text-dark-ink">{t('voiceTwin.profile')}</p>
              <p className="text-sm text-muted">{active.voiceSummary}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                <p>{t('voiceTwin.markerFormality')}: {active.markers.formality}</p>
                <p>{t('voiceTwin.markerSentence')}: {active.markers.avgSentenceLen}</p>
                <p>{t('voiceTwin.markerHedge')}: {active.markers.hedgeRate}</p>
                <p>{t('voiceTwin.markerDocs')}: {active.sourceDocIds.length || active.markers.sampleCount}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t('voiceTwin.do')}</p>
                <ul className="space-y-1 text-sm text-ink dark:text-dark-ink">
                  {active.doList.map((d) => (
                    <li key={d}>• {d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t('voiceTwin.dont')}</p>
                <ul className="space-y-1 text-sm text-ink dark:text-dark-ink">
                  {active.dontList.map((d) => (
                    <li key={d}>• {d}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-muted">
                <span className="font-semibold text-ink dark:text-dark-ink">{t('voiceTwin.opening')}:</span>{' '}
                {active.sampleOpening}
              </p>
              <p className="text-xs text-muted">{t('voiceTwin.editorHint')}</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
