import { useEffect, useState } from 'react'
import { Palette, Sparkles } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { useT } from '../i18n/useT'
import { ACCENT_PALETTES } from '../theme/palettes'
import {
  atelierService,
  type BrandKit,
  type ToneProfile,
} from '../services/atelierService'
import { useDocsStore } from '../store/docs'
import { useSettingsStore } from '../store/auth'

export function AtelierPage() {
  const t = useT()
  const showToast = useDocsStore((s) => s.showToast)
  const accentId = useSettingsStore((s) => s.accentId)
  const studioAccent = ACCENT_PALETTES.find((p) => p.id === accentId)?.accent ?? '#c47b2d'

  const [kits, setKits] = useState<BrandKit[]>([])
  const [tones, setTones] = useState<ToneProfile[]>([])
  const [kitId, setKitId] = useState('')
  const [toneId, setToneId] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [fit, setFit] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const [kitForm, setKitForm] = useState({
    name: '',
    accentHex: studioAccent,
    logoText: 'Voice2Doc Studio',
    footerLine: 'Confidential — Voice2Doc AI',
    letterheadTitle: 'Studio Document',
  })
  const [toneForm, setToneForm] = useState({
    name: '',
    voiceSummary: '',
    doList: 'Lead with the decision\nName owners',
    dontList: 'Hedging language\nEmoji',
    sampleOpening: 'Recommendation: proceed.',
  })

  const sampleBody =
    '<h2>Weekly update</h2><p>Recommendation: proceed with the staged rollout. Alex owns QA. Avoid hedging language in the board pack.</p>'

  const load = async () => {
    setBusy(true)
    try {
      const [k, tn] = await Promise.all([atelierService.listBrandKits(), atelierService.listToneProfiles()])
      setKits(k.brandKits)
      setTones(tn.toneProfiles)
      setKitId(k.brandKits.find((x) => x.isDefault)?.id || k.brandKits[0]?.id || '')
      setToneId(tn.toneProfiles.find((x) => x.isDefault)?.id || tn.toneProfiles[0]?.id || '')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load atelier')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!kitId && !toneId) return
    void (async () => {
      try {
        const preview = await atelierService.preview({
          contentHtml: sampleBody,
          brandKitId: kitId || undefined,
          toneProfileId: toneId || undefined,
        })
        setPreviewHtml(preview.html)
        setFit(preview.toneFitScore)
      } catch {
        /* ignore preview errors while editing */
      }
    })()
  }, [kitId, toneId])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">{t('atelier.title')}</h1>
        <p className="mt-1 text-muted">{t('atelier.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Palette className="text-accent" size={18} />
            <h2 className="font-semibold text-ink dark:text-dark-ink">{t('atelier.brandTitle')}</h2>
          </div>
          <div className="space-y-2">
            {kits.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKitId(k.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                  kitId === k.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border dark:border-dark-border'
                }`}
              >
                <span className="h-6 w-6 rounded-full" style={{ background: k.accentHex }} />
                <span className="text-sm font-medium text-ink dark:text-dark-ink">{k.name}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            <input
              className="input-field"
              placeholder={t('atelier.kitName')}
              value={kitForm.name}
              onChange={(e) => setKitForm({ ...kitForm, name: e.target.value })}
            />
            <div className="flex gap-2">
              <input
                className="input-field"
                type="color"
                value={kitForm.accentHex}
                onChange={(e) => setKitForm({ ...kitForm, accentHex: e.target.value })}
              />
              <input
                className="input-field"
                value={kitForm.logoText}
                onChange={(e) => setKitForm({ ...kitForm, logoText: e.target.value })}
                placeholder={t('atelier.logoText')}
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !kitForm.name.trim()}
              onClick={async () => {
                try {
                  const kit = await atelierService.createBrandKit({ ...kitForm, isDefault: false })
                  setKits((prev) => [kit, ...prev])
                  setKitId(kit.id)
                  setKitForm({ ...kitForm, name: '' })
                  showToast(t('atelier.kitSaved'))
                } catch (err) {
                  showToast(err instanceof Error ? err.message : 'Save failed')
                }
              }}
            >
              {t('atelier.saveKit')}
            </button>
          </div>
        </GlassCard>

        <GlassCard className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="text-accent" size={18} />
            <h2 className="font-semibold text-ink dark:text-dark-ink">{t('atelier.toneTitle')}</h2>
          </div>
          <div className="space-y-2">
            {tones.map((tn) => (
              <button
                key={tn.id}
                type="button"
                onClick={() => setToneId(tn.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left ${
                  toneId === tn.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border dark:border-dark-border'
                }`}
              >
                <p className="text-sm font-medium text-ink dark:text-dark-ink">{tn.name}</p>
                <p className="mt-1 text-xs text-muted line-clamp-2">{tn.voiceSummary}</p>
              </button>
            ))}
          </div>
          <input
            className="input-field"
            placeholder={t('atelier.toneName')}
            value={toneForm.name}
            onChange={(e) => setToneForm({ ...toneForm, name: e.target.value })}
          />
          <textarea
            className="input-field min-h-20"
            placeholder={t('atelier.voiceSummary')}
            value={toneForm.voiceSummary}
            onChange={(e) => setToneForm({ ...toneForm, voiceSummary: e.target.value })}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !toneForm.name.trim() || !toneForm.voiceSummary.trim()}
            onClick={async () => {
              try {
                const tone = await atelierService.createToneProfile({
                  name: toneForm.name,
                  voiceSummary: toneForm.voiceSummary,
                  doList: toneForm.doList.split('\n').map((s) => s.trim()).filter(Boolean),
                  dontList: toneForm.dontList.split('\n').map((s) => s.trim()).filter(Boolean),
                  sampleOpening: toneForm.sampleOpening,
                })
                setTones((prev) => [tone, ...prev])
                setToneId(tone.id)
                setToneForm({ ...toneForm, name: '', voiceSummary: '' })
                showToast(t('atelier.toneSaved'))
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Save failed')
              }
            }}
          >
            {t('atelier.saveTone')}
          </button>
        </GlassCard>
      </div>

      <GlassCard className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-ink dark:text-dark-ink">{t('atelier.previewTitle')}</h2>
          {fit != null && (
            <span className="rounded-full bg-signal/15 px-3 py-1 text-xs font-semibold text-signal">
              {t('atelier.toneFit')}: {fit}%
            </span>
          )}
        </div>
        <div
          className="prose-editor rounded-xl border border-border/80 bg-white/50 p-5 text-sm dark:border-dark-border dark:bg-white/5"
          dangerouslySetInnerHTML={{ __html: previewHtml || sampleBody }}
        />
      </GlassCard>
    </div>
  )
}
