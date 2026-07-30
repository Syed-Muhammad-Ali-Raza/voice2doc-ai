import type { ReactNode } from 'react'
import { DOCUMENT_TYPES, LANGUAGES, LENGTHS, TONES } from '../lib/types'
import type { ProcessConfig } from '../lib/types'

export function AiConfigForm({
  value,
  onChange,
}: {
  value: ProcessConfig
  onChange: (next: ProcessConfig) => void
}) {
  const field = (label: string, children: ReactNode) => (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field(
        'Document type',
        <select
          className="input-field"
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value as ProcessConfig['type'] })}
        >
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>,
      )}
      {field(
        'Tone',
        <select
          className="input-field"
          value={value.tone}
          onChange={(e) => onChange({ ...value, tone: e.target.value as ProcessConfig['tone'] })}
        >
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>,
      )}
      {field(
        'Length',
        <select
          className="input-field"
          value={value.length}
          onChange={(e) => onChange({ ...value, length: e.target.value as ProcessConfig['length'] })}
        >
          {LENGTHS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>,
      )}
      {field(
        'Language',
        <select
          className="input-field"
          value={value.language}
          onChange={(e) => onChange({ ...value, language: e.target.value as ProcessConfig['language'] })}
        >
          {LANGUAGES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>,
      )}
      <label className="flex items-center gap-3 sm:col-span-2">
        <input
          type="checkbox"
          checked={value.speakerDetection}
          onChange={(e) => onChange({ ...value, speakerDetection: e.target.checked })}
          className="h-4 w-4 rounded border-border accent-accent"
        />
        <span className="text-sm text-ink dark:text-dark-ink">Speaker detection (optional)</span>
      </label>
    </div>
  )
}

export function defaultConfig(source: ProcessConfig['source']): ProcessConfig {
  return {
    type: 'Meeting Notes',
    tone: 'Professional',
    length: 'Medium',
    language: 'English',
    speakerDetection: false,
    source,
  }
}
