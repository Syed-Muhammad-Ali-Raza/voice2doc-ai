import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Headphones, Mic, Square, Volume2, X } from 'lucide-react'
import { useT } from '../i18n/useT'
import {
  localeToSpeechLang,
  playVoiceGuide,
  speechSupported,
  stopVoiceGuide,
  VOICE_TOURS,
  type VoiceTourId,
} from '../lib/voiceGuide'
import { parseVoiceCommand, type MatchedCommand } from '../lib/speechRecognition'
import { complianceService } from '../services/complianceService'
import { useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'

export function VoiceGuideButton() {
  const t = useT()
  const navigate = useNavigate()
  const locale = useSettingsStore((s) => s.locale)
  const showToast = useDocsStore((s) => s.showToast)
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(0)
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [recogSupported, setRecogSupported] = useState(true)
  const [pending, setPending] = useState<MatchedCommand | null>(null)
  const [continuous, setContinuous] = useState(false)
  const recognitionRef = useRef<any>(null)
  const continuousRef = useRef(false)

  useEffect(() => {
    setSupported(speechSupported())
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setRecogSupported(Boolean(SpeechRecognition))
    return () => {
      stopVoiceGuide()
      continuousRef.current = false
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => setPending(null), 8000)
    return () => window.clearTimeout(timer)
  }, [pending])

  const start = (id: VoiceTourId) => {
    if (!supported) return
    stopVoiceControl()
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

  const executeCommand = async (match: MatchedCommand) => {
    showToast(t('voiceGuide.commandRecognized', { command: t(match.labelKey) }))
    try {
      await complianceService.logVoiceCommand(match.label)
    } catch (err) {
      console.error('Failed to log voice command', err)
    }

    if (match.action === 'navigate') {
      navigate(match.path!)
    } else if (match.action === 'voice-action') {
      if (match.pathHint && !window.location.pathname.startsWith(match.pathHint)) {
        if (match.actionType === 'start-recording') {
          navigate('/app/record?start=1')
        } else if (match.actionType === 'export-notion') {
          showToast(t('voiceGuide.openDocToExport'))
        }
      } else {
        window.dispatchEvent(new CustomEvent('v2d-voice-action', { detail: { actionType: match.actionType } }))
      }
    }
  }

  const handleTranscript = (text: string) => {
    const match = parseVoiceCommand(text, locale)
    if (!match) {
      showToast(t('voiceGuide.commandNotRecognized', { phrase: text }))
      return
    }
    if (match.confirm) {
      setPending(match)
      return
    }
    void executeCommand(match)
  }

  const confirmPending = () => {
    if (!pending) return
    const match = pending
    setPending(null)
    void executeCommand(match)
  }

  const cancelPending = () => {
    if (!pending) return
    const label = pending.label
    setPending(null)
    showToast(t('voiceGuide.commandCancelled'))
    complianceService.logVoiceCommand(label, 'cancelled').catch(() => {})
  }

  const startVoiceControl = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    setListening(true)
    setPending(null)
    stop() // Stop playing guide if active

    const rec = new SpeechRecognition()
    rec.continuous = continuousRef.current
    rec.interimResults = false
    rec.lang = localeToSpeechLang(locale)

    rec.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0]?.transcript
      if (!text) return
      handleTranscript(text)
    }

    rec.onerror = (e: any) => {
      console.error(e)
      continuousRef.current = continuousRef.current && e?.error !== 'aborted'
      setListening(false)
    }

    rec.onend = () => {
      setListening(false)
      if (continuousRef.current) {
        try {
          rec.start()
          setListening(true)
        } catch {
          // start() throws if the recognizer is busy ending; user can retry
        }
      }
    }

    recognitionRef.current = rec
    rec.start()
  }

  const stopVoiceControl = () => {
    continuousRef.current = false
    setContinuous(false)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setListening(false)
  }

  const toggleContinuous = () => {
    const next = !continuous
    setContinuous(next)
    if (listening) {
      // Restart so the new mode applies immediately
      stopVoiceControl()
      if (next) {
        continuousRef.current = true
        setContinuous(true)
        startVoiceControl()
      }
    } else {
      continuousRef.current = next
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-3 md:right-6 md:bottom-6">
      {pending && (
        <div className="glass-strong w-[min(100vw-2rem,22rem)] p-4 shadow-lg" role="alertdialog" aria-label={t('voiceGuide.confirmTitle', { command: t(pending.labelKey) })}>
          <p className="text-sm font-medium text-ink dark:text-dark-ink">
            {t('voiceGuide.confirmTitle', { command: t(pending.labelKey) })}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary flex flex-1 items-center justify-center gap-1.5 py-2" onClick={confirmPending}>
              <Check size={14} /> {t('voiceGuide.confirmYes')}
            </button>
            <button type="button" className="btn-secondary flex-1 py-2" onClick={cancelPending}>
              {t('voiceGuide.confirmNo')}
            </button>
          </div>
        </div>
      )}

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

              <div className="my-3 border-t border-border dark:border-dark-border" />
              <div className="space-y-2">
                <div className="flex flex-col gap-0.5">
                  <p className="font-display text-sm font-semibold text-ink dark:text-dark-ink flex items-center gap-1.5">
                    <Mic size={14} className="text-accent" /> {t('voiceGuide.speakTitle')}
                  </p>
                  <p className="text-[10px] text-muted leading-tight">{t('voiceGuide.speakSubtitle')}</p>
                </div>

                {!recogSupported ? (
                  <p className="text-xs text-muted">{t('voiceGuide.speakUnsupported')}</p>
                ) : (
                  <>
                    {listening ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          className="btn-primary w-full justify-center py-2 flex items-center gap-2 bg-red-500 hover:bg-red-600 border-red-500 text-white animate-pulse"
                          onClick={stopVoiceControl}
                        >
                          <Mic size={14} />
                          {t('voiceGuide.stopListening')}
                        </button>
                        <p className="text-xs text-center text-red-500 font-medium animate-pulse">
                          {t('voiceGuide.listening')}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary w-full justify-center py-2 flex items-center gap-2"
                        onClick={startVoiceControl}
                        disabled={playing}
                      >
                        <Mic size={14} />
                        {t('voiceGuide.startListening')}
                      </button>
                    )}
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                      <input type="checkbox" checked={continuous} onChange={toggleContinuous} className="accent-[rgb(var(--studio-accent-rgb))]" />
                      {t('voiceGuide.keepListening')}
                    </label>
                  </>
                )}
              </div>
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
