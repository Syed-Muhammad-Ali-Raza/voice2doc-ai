import { useEffect, useState } from 'react'
import { Headphones, Square, Volume2, X } from 'lucide-react'
import { useT } from '../i18n/useT'
import {
  localeToSpeechLang,
  playVoiceGuide,
  speechSupported,
  stopVoiceGuide,
  VOICE_TOURS,
  type VoiceTourId,
} from '../lib/voiceGuide'
import { useSettingsStore } from '../store/auth'

export function VoiceGuideButton() {
  const t = useT()
  const locale = useSettingsStore((s) => s.locale)
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(0)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setSupported(speechSupported())
    return () => stopVoiceGuide()
  }, [])

  const start = (id: VoiceTourId) => {
    if (!supported) return
    setPlaying(true)
    setStep(0)
    playVoiceGuide(id, {
      lang: localeToSpeechLang(locale),
      onStep: setStep,
      onEnd: () => setPlaying(false),
    })
  }

  const stop = () => {
    stopVoiceGuide()
    setPlaying(false)
  }

  return (
    <div className="fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-3 md:right-6 md:bottom-6">
      {open && (
        <div className="glass-strong w-[min(100vw-2rem,22rem)] p-4 shadow-lg">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg font-semibold text-ink dark:text-dark-ink">
                {t('voiceGuide.title')}
              </p>
              <p className="mt-1 text-xs text-muted">{t('voiceGuide.subtitle')}</p>
            </div>
            <button type="button" className="btn-ghost p-1" aria-label={t('common.closeMenu')} onClick={() => { stop(); setOpen(false) }}>
              <X size={16} />
            </button>
          </div>

          {!supported ? (
            <p className="text-sm text-muted">{t('voiceGuide.unsupported')}</p>
          ) : (
            <div className="space-y-2">
              {VOICE_TOURS.map((tour) => (
                <button
                  key={tour.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-sm transition hover:bg-accent/10 dark:border-dark-border"
                  onClick={() => start(tour.id)}
                  disabled={playing}
                >
                  <Volume2 size={16} className="shrink-0 text-accent" />
                  <span className="font-medium text-ink dark:text-dark-ink">{t(tour.titleKey)}</span>
                </button>
              ))}
              {playing && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs text-accent">
                  <span>
                    {t('voiceGuide.playing')} · {t('voiceGuide.step')} {step + 1}
                  </span>
                  <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={stop}>
                    <Square size={12} /> {t('voiceGuide.stop')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className={`record-pulse flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:brightness-110 ${
          open || playing ? 'ring-4 ring-accent/30' : ''
        }`}
        aria-label={t('voiceGuide.title')}
        aria-expanded={open}
        onClick={() => {
          if (open) {
            stop()
            setOpen(false)
          } else {
            setOpen(true)
          }
        }}
      >
        <Headphones size={22} />
      </button>
    </div>
  )
}
