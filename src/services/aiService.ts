import { env } from '../config/env'
import { delay, generateMockDocument, transformWithAi } from '../lib/mockAi'
import { apiFetch, ApiError } from '../lib/apiClient'
import type { DocumentType, Length, ProcessConfig, Tone } from '../lib/types'
import type { DocItem } from '../lib/types'

export type ProcessStage = 'Uploading' | 'Transcribing' | 'Understanding' | 'Formatting' | 'Finalizing'

export interface ProcessResult {
  id?: string
  title: string
  content: string
  type: DocumentType
  tone: Tone
  language: ProcessConfig['language']
  entitlements?: {
    plan: string
    trialsUsed: number
    trialsLimit: number
    unlimitedAi: boolean
  }
  provider?: string | null
}

export interface AiService {
  runProcessPipeline: (
    config: ProcessConfig,
    onStage: (stage: ProcessStage, index: number) => void,
    audio?: Blob | null,
  ) => Promise<ProcessResult>
  transform: (
    html: string,
    action: 'rewrite' | 'expand' | 'shorten' | 'grammar' | 'translate',
    language?: string,
  ) => Promise<string>
}

const stages: ProcessStage[] = ['Uploading', 'Transcribing', 'Understanding', 'Formatting', 'Finalizing']

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const mockAi: AiService = {
  async runProcessPipeline(config, onStage) {
    for (let i = 0; i < stages.length; i++) {
      onStage(stages[i]!, i)
      await delay(700 + i * 120)
    }
    const generated = generateMockDocument(
      config.type,
      config.tone,
      config.length as Length,
      config.sourceLabel,
    )
    return {
      title: generated.title,
      content: generated.content,
      type: config.type,
      tone: config.tone,
      language: config.language,
      provider: 'mock',
    }
  },
  async transform(html, action, language) {
    await delay(700)
    return transformWithAi(html, action, language)
  },
}

interface JobPayload {
  job: {
    id: string
    status: string
    stage: string
    stageIndex: number
    done: boolean
    error: string | null
    provider: string | null
  }
  result?: DocItem & { type: DocumentType; tone: Tone; language: ProcessConfig['language'] }
  entitlements?: ProcessResult['entitlements']
}

async function pollJob(
  jobId: string,
  onStage: (stage: ProcessStage, index: number) => void,
): Promise<ProcessResult> {
  for (let attempt = 0; attempt < 120; attempt++) {
    const body = await apiFetch<JobPayload>(`/ai/jobs/${jobId}`, {}, base())
    const idx = Math.max(0, Math.min(4, body.job.stageIndex))
    onStage((body.job.stage as ProcessStage) || stages[idx]!, idx)

    if (body.job.status === 'failed') {
      throw new Error(body.job.error || 'Processing failed')
    }
    if (body.job.status === 'payment_required') {
      throw new ApiError(402, body.job.error || 'Free limit reached')
    }
    if (body.job.done && body.result) {
      return {
        id: body.result.id,
        title: body.result.title,
        content: body.result.content,
        type: body.result.type,
        tone: body.result.tone,
        language: body.result.language,
        entitlements: body.entitlements,
        provider: body.job.provider,
      }
    }
    await delay(500)
  }
  throw new Error('Processing timed out')
}

const httpAi: AiService = {
  async runProcessPipeline(config, onStage, audio) {
    onStage('Uploading', 0)
    const form = new FormData()
    form.append('config', JSON.stringify(config))
    if (audio) {
      const name =
        audio instanceof File
          ? audio.name
          : `recording-${Date.now()}.webm`
      form.append('audio', audio, name)
    }

    const created = await apiFetch<{ job: { id: string; stageIndex: number; stage: string } }>(
      '/ai/jobs',
      { method: 'POST', body: form },
      base(),
    )
    return pollJob(created.job.id, onStage)
  },
  async transform(html, action, language) {
    const body = await apiFetch<{ html: string }>(
      '/ai/transform',
      { method: 'POST', body: JSON.stringify({ html, action, language }) },
      base(),
    )
    return body.html
  },
}

export const aiService: AiService = env.useMockApi ? mockAi : httpAi
