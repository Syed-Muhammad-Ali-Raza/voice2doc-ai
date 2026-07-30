import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pause, Play, Square, Trash2 } from 'lucide-react'
import { AiConfigForm, defaultConfig } from '../components/AiConfigForm'
import { GlassCard } from '../components/GlassCard'
import { Waveform } from '../components/Waveform'
import { canUseAiDocument, trialsRemaining } from '../lib/trials'
import type { ProcessConfig } from '../lib/types'
import { useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function RecordPage() {
  const navigate = useNavigate()
  const setPendingConfig = useDocsStore((s) => s.setPendingConfig)
  const setPendingAudio = useDocsStore((s) => s.setPendingAudio)
  const showToast = useDocsStore((s) => s.showToast)
  const usage = useDocsStore((s) => s.usage)
  const plan = useSettingsStore((s) => s.plan)
  const remaining = trialsRemaining(plan, usage.trialsUsed)
  const [config, setConfig] = useState<ProcessConfig>(defaultConfig('record'))
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const startTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRecording = async () => {
    setPermissionError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      mediaRef.current = recorder
      recorder.start(250)
      setStatus('recording')
      startTimer()
    } catch {
      setPermissionError('Microphone unavailable — processing will run without a real audio file.')
      setStatus('recording')
      startTimer()
    }
  }

  const pauseRecording = () => {
    mediaRef.current?.pause()
    setStatus('paused')
    stopTimer()
  }

  const resumeRecording = () => {
    mediaRef.current?.resume()
    setStatus('recording')
    startTimer()
  }

  const stopRecording = () => {
    const recorder = mediaRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop())
      }
      recorder.stop()
    }
    setStatus('stopped')
    stopTimer()
  }

  const deleteRecording = () => {
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop())
    mediaRef.current = null
    chunksRef.current = []
    setSeconds(0)
    setStatus('idle')
    stopTimer()
  }

  const process = () => {
    if (status !== 'stopped' && status !== 'paused' && seconds === 0) {
      showToast('Record something first.')
      return
    }
    if (!canUseAiDocument(plan, usage.trialsUsed)) {
      showToast('Free limit reached — upgrade for unlimited documents.')
      navigate('/app/billing')
      return
    }
    if (status === 'recording' || status === 'paused') stopRecording()

    const blob =
      chunksRef.current.length > 0
        ? new Blob(chunksRef.current, { type: mediaRef.current?.mimeType || 'audio/webm' })
        : null

    setPendingAudio(blob && blob.size > 0 ? blob : null)
    setPendingConfig({
      ...config,
      source: 'record',
      sourceLabel: `Recording ${formatTime(seconds)}`,
    })
    navigate('/app/processing')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Record Audio</h1>
        <p className="mt-1 text-muted">Speak freely. We will shape it into a document.</p>
        {remaining !== null && (
          <p className="mt-2 text-sm text-accent">
            {remaining} of {usage.trialsLimit} free AI documents left
            {remaining === 0 && (
              <>
                {' '}
                · <Link to="/app/billing" className="underline">Upgrade</Link>
              </>
            )}
          </p>
        )}
      </div>

      <GlassCard strong className="space-y-6 p-6 md:p-8">
        <div className="text-center">
          <p className="font-display text-4xl tabular-nums text-ink dark:text-dark-ink">{formatTime(seconds)}</p>
          <p className="mt-1 text-sm capitalize text-muted">{status === 'idle' ? 'Ready' : status}</p>
        </div>
        <Waveform active={status === 'recording'} />
        {permissionError && <p className="text-center text-sm text-accent">{permissionError}</p>}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {status === 'idle' && (
            <button type="button" className="btn-primary record-pulse h-14 w-14 rounded-full p-0" onClick={startRecording} aria-label="Start recording">
              <span className="h-4 w-4 rounded-sm bg-white" />
            </button>
          )}
          {status === 'recording' && (
            <>
              <button type="button" className="btn-secondary" onClick={pauseRecording}>
                <Pause size={16} /> Pause
              </button>
              <button type="button" className="btn-primary" onClick={stopRecording}>
                <Square size={16} /> Stop
              </button>
            </>
          )}
          {status === 'paused' && (
            <>
              <button type="button" className="btn-secondary" onClick={resumeRecording}>
                <Play size={16} /> Resume
              </button>
              <button type="button" className="btn-primary" onClick={stopRecording}>
                <Square size={16} /> Stop
              </button>
            </>
          )}
          {(status === 'stopped' || seconds > 0) && (
            <button type="button" className="btn-ghost text-danger" onClick={deleteRecording}>
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </GlassCard>

      <GlassCard className="space-y-4 p-6">
        <h2 className="font-semibold text-ink dark:text-dark-ink">AI customization</h2>
        <AiConfigForm value={config} onChange={setConfig} />
        <button
          type="button"
          className="btn-primary w-full"
          onClick={process}
          disabled={(seconds === 0 && status === 'idle') || remaining === 0}
        >
          {remaining === 0 ? 'Upgrade to process' : 'Process recording'}
        </button>
      </GlassCard>
    </div>
  )
}
