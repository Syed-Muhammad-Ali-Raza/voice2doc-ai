import { useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { AiConfigForm, defaultConfig } from '../components/AiConfigForm'
import { GlassCard } from '../components/GlassCard'
import { canUseAiDocument, trialsRemaining } from '../lib/trials'
import { AUDIO_EXTENSIONS } from '../lib/types'
import type { ProcessConfig } from '../lib/types'
import { useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'

function isValidAudio(file: File) {
  const lower = file.name.toLowerCase()
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext)) || file.type.startsWith('audio/')
}

export function UploadPage() {
  const navigate = useNavigate()
  const setPendingConfig = useDocsStore((s) => s.setPendingConfig)
  const setPendingAudio = useDocsStore((s) => s.setPendingAudio)
  const showToast = useDocsStore((s) => s.showToast)
  const usage = useDocsStore((s) => s.usage)
  const plan = useSettingsStore((s) => s.plan)
  const remaining = trialsRemaining(plan, usage.trialsUsed)
  const inputRef = useRef<HTMLInputElement>(null)
  const [config, setConfig] = useState<ProcessConfig>(defaultConfig('upload'))
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)

  const acceptFile = (next: File | null) => {
    if (!next) return
    if (!isValidAudio(next)) {
      showToast('Unsupported format. Use MP3, WAV, M4A, AAC, or FLAC.')
      return
    }
    setFile(next)
    setProgress(0)
    let p = 0
    const id = window.setInterval(() => {
      p += 12
      setProgress(Math.min(100, p))
      if (p >= 100) window.clearInterval(id)
    }, 80)
  }

  const process = () => {
    if (!file || progress < 100) {
      showToast('Upload a file first.')
      return
    }
    if (!canUseAiDocument(plan, usage.trialsUsed)) {
      showToast('Free limit reached — upgrade for unlimited documents.')
      navigate('/app/billing')
      return
    }
    setPendingAudio(file)
    setPendingConfig({
      ...config,
      source: 'upload',
      sourceLabel: file.name,
    })
    navigate('/app/processing')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Upload Audio</h1>
        <p className="mt-1 text-muted">Drop a recording and choose how AI should shape it.</p>
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

      <GlassCard
        strong
        className={`border-dashed p-8 text-center transition ${dragging ? 'ring-2 ring-accent' : ''}`}
        onDragOver={(e: DragEvent) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault()
          setDragging(false)
          acceptFile(e.dataTransfer.files?.[0] ?? null)
        }}
      >
        <Upload className="mx-auto text-accent" size={28} />
        <p className="mt-3 font-medium text-ink dark:text-dark-ink">Drag and drop audio here</p>
        <p className="mt-1 text-sm text-muted">MP3, WAV, M4A, AAC, FLAC</p>
        <button type="button" className="btn-secondary mt-5" onClick={() => inputRef.current?.click()}>
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.aac,.flac,audio/*"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <div className="mt-6 text-left">
            <p className="text-sm font-medium text-ink dark:text-dark-ink">{file.name}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{progress}%</p>
          </div>
        )}
      </GlassCard>

      <GlassCard className="space-y-4 p-6">
        <h2 className="font-semibold text-ink dark:text-dark-ink">AI customization</h2>
        <AiConfigForm value={config} onChange={setConfig} />
        <button
          type="button"
          className="btn-primary w-full"
          onClick={process}
          disabled={!file || progress < 100 || remaining === 0}
        >
          {remaining === 0 ? 'Upgrade to process' : 'Process upload'}
        </button>
      </GlassCard>
    </div>
  )
}
