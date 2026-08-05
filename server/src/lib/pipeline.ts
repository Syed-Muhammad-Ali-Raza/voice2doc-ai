import { v4 as uuid } from 'uuid'
import fs from 'node:fs'
import path from 'node:path'
import OpenAI, { toFile } from 'openai'
import { db, uploadsDir } from '../db.js'
import { generateDocumentHtml } from './generateDoc.js'
import { upsertEchoScore } from './echo.js'

export const STAGES = ['Uploading', 'Transcribing', 'Understanding', 'Formatting', 'Finalizing'] as const
export type StageName = (typeof STAGES)[number]

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function updateJob(
  id: string,
  patch: {
    status?: string
    stage?: string
    stage_index?: number
    transcript?: string
    document_id?: string
    error?: string
    provider?: string
    finished_at?: string | null
  },
) {
  const current = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown>
  if (!current) return
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE jobs SET
      status = ?,
      stage = ?,
      stage_index = ?,
      transcript = ?,
      document_id = ?,
      error = ?,
      provider = ?,
      updated_at = ?,
      finished_at = ?
     WHERE id = ?`,
  ).run(
    patch.status ?? current.status,
    patch.stage ?? current.stage,
    patch.stage_index ?? current.stage_index,
    patch.transcript ?? current.transcript,
    patch.document_id ?? current.document_id,
    patch.error ?? current.error,
    patch.provider ?? current.provider,
    now,
    patch.finished_at === undefined ? current.finished_at : patch.finished_at,
    id,
  )
}

async function transcribeAudio(filePath: string, language: string): Promise<{ text: string; provider: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    const openai = new OpenAI({ apiKey })
    const langHint: Record<string, string> = {
      English: 'en',
      Spanish: 'es',
      French: 'fr',
      German: 'de',
      Arabic: 'ar',
      Urdu: 'ur',
    }
    const file = await toFile(fs.createReadStream(filePath), path.basename(filePath))
    const result = await openai.audio.transcriptions.create({
      file,
      model: process.env.OPENAI_STT_MODEL || 'whisper-1',
      language: langHint[language],
    })
    return { text: result.text, provider: 'openai-whisper' }
  }

  await sleep(600)
  return {
    text: `[Demo transcript] Audio received (${path.basename(filePath)}). Set OPENAI_API_KEY on the server to enable real Whisper transcription. Spoken topics include priorities, next steps, and a short summary of the conversation.`,
    provider: 'mock-stt',
  }
}

async function formatWithLlm(input: {
  transcript: string
  type: string
  tone: string
  length: string
  language: string
  sourceLabel?: string
}): Promise<{ title: string; content: string; provider: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You convert transcripts into polished HTML documents. Return JSON with keys title and content (HTML only, use h2/h3/p/ul/li). Document type: ${input.type}. Tone: ${input.tone}. Length: ${input.length}. Language: ${input.language}.`,
        },
        {
          role: 'user',
          content: `Source label: ${input.sourceLabel ?? 'audio'}\n\nTranscript:\n${input.transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw) as { title?: string; content?: string }
    return {
      title: parsed.title || `${input.type} — ${new Date().toLocaleDateString()}`,
      content: parsed.content || `<p>${input.transcript}</p>`,
      provider: 'openai-llm',
    }
  }

  await sleep(500)
  const base = generateDocumentHtml(input.type, input.tone, input.length, input.sourceLabel)
  return {
    title: base.title,
    content: `${base.content}<h3>Transcript excerpt</h3><p>${input.transcript.slice(0, 1200)}</p>`,
    provider: 'mock-llm',
  }
}

export async function runJobPipeline(jobId: string) {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as
    | {
        id: string
        user_id: string
        audio_id: string | null
        config_json: string
      }
    | undefined

  if (!job) return

  try {
    const config = JSON.parse(job.config_json) as {
      type: string
      tone: string
      length: string
      language: string
      sourceLabel?: string
    }

    updateJob(jobId, { status: 'running', stage: 'Uploading', stage_index: 0 })
    await sleep(350)

    let filePath: string | null = null
    if (job.audio_id) {
      const audio = db
        .prepare('SELECT storage_key FROM audio_assets WHERE id = ?')
        .get(job.audio_id) as { storage_key: string } | undefined
      if (audio) filePath = path.join(uploadsDir, audio.storage_key)
    }

    updateJob(jobId, { stage: 'Transcribing', stage_index: 1 })
    let transcript =
      'No audio attached. Document generated from processing preferences only.'
    let sttProvider = 'none'
    if (filePath && fs.existsSync(filePath)) {
      const result = await transcribeAudio(filePath, config.language)
      transcript = result.text
      sttProvider = result.provider
    } else {
      await sleep(400)
    }
    updateJob(jobId, { transcript, provider: sttProvider })

    updateJob(jobId, { stage: 'Understanding', stage_index: 2 })
    await sleep(400)

    updateJob(jobId, { stage: 'Formatting', stage_index: 3 })
    const formatted = await formatWithLlm({
      transcript,
      type: config.type,
      tone: config.tone,
      length: config.length,
      language: config.language,
      sourceLabel: config.sourceLabel,
    })

    updateJob(jobId, { stage: 'Finalizing', stage_index: 4, provider: `${sttProvider}+${formatted.provider}` })

    const user = db
      .prepare('SELECT plan, trials_used, trials_limit FROM users WHERE id = ?')
      .get(job.user_id) as { plan: string; trials_used: number; trials_limit: number }

    const unlimited = user.plan === 'pro' || user.plan === 'business' || user.plan === 'enterprise'
    const docId = uuid()
    const now = new Date().toISOString()

    const finish = db.transaction(() => {
      if (!unlimited) {
        const result = db
          .prepare(
            `UPDATE users SET trials_used = trials_used + 1
             WHERE id = ? AND plan = 'free' AND trials_used < trials_limit`,
          )
          .run(job.user_id)
        if (result.changes === 0) throw new Error('PAYMENT_REQUIRED')
      }
      db.prepare(
        `INSERT INTO documents (id, user_id, title, type, content, tone, language, favorite, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      ).run(
        docId,
        job.user_id,
        formatted.title,
        config.type,
        formatted.content,
        config.tone,
        config.language,
        now,
        now,
      )
      updateJob(jobId, {
        status: 'completed',
        document_id: docId,
        finished_at: now,
        stage: 'Finalizing',
        stage_index: 4,
      })
    })

    finish()

    try {
      upsertEchoScore({
        userId: job.user_id,
        documentId: docId,
        transcript,
        draftHtml: formatted.content,
        jobId,
      })
    } catch {
      /* echo score is non-blocking */
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Job failed'
    updateJob(jobId, {
      status: message === 'PAYMENT_REQUIRED' ? 'payment_required' : 'failed',
      error: message === 'PAYMENT_REQUIRED' ? 'Free limit reached. Upgrade to continue.' : message,
      finished_at: new Date().toISOString(),
    })
  }
}

export function enqueueJob(jobId: string) {
  setImmediate(() => {
    void runJobPipeline(jobId)
  })
}
