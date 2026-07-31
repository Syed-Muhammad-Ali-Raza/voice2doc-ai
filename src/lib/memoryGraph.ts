/**
 * Pure Meeting Memory Graph helpers (Phase 7).
 * Safe to unit-test without SQLite or Express.
 */

export type ThreadKind = 'decision' | 'action' | 'topic'

export interface ActionCandidate {
  text: string
  ownerLabel: string | null
  dueHint: string | null
}

export interface SpeakerSegment {
  speaker: string
  text: string
  startMs: number
  endMs: number
}

/** Normalize text into a stable fingerprint for decision dedupe. */
export function fingerprintDecision(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|to|for|and|or|of|in|on|we|will|should|decided|that)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

export function shouldMergeByFingerprint(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  return a.includes(b) || b.includes(a)
}

/** Parse "Speaker: line" style transcripts into timed segments. */
export function extractSpeakerSegments(transcript: string): SpeakerSegment[] {
  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const segments: SpeakerSegment[] = []
  let cursor = 0
  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9 ._-]{0,40}?):\s+(.+)$/)
    const speaker = m ? m[1]!.trim() : 'Unknown'
    const text = m ? m[2]!.trim() : line
    const duration = Math.max(2000, text.split(/\s+/).length * 350)
    segments.push({ speaker, text, startMs: cursor, endMs: cursor + duration })
    cursor += duration
  }
  return segments
}

/**
 * Heuristic action extraction from meeting text.
 * Matches bullets / "Action:" / "will … by …" patterns.
 */
export function extractActionCandidates(transcript: string): ActionCandidate[] {
  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const out: ActionCandidate[] = []

  for (const raw of lines) {
    const line = raw.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '')
    const actionMatch = line.match(/^(?:action(?:\s*item)?|todo|follow[- ]?up)\s*[:\-–]\s*(.+)$/i)
    const willMatch = line.match(/^(.+?)\s+will\s+(.+?)(?:\s+by\s+(.+))?\.?$/i)
    const assignMatch = line.match(/^(?:assign(?:ed)?\s+to|owner)\s*[:\-–]\s*([^—\-]+)(?:[—\-–:]\s*(.+))?$/i)

    if (actionMatch) {
      const text = actionMatch[1]!.trim()
      const owner = text.match(/\(([^)]+)\)\s*$/)
      out.push({
        text: owner ? text.replace(/\s*\([^)]+\)\s*$/, '').trim() : text,
        ownerLabel: owner?.[1]?.trim() ?? null,
        dueHint: null,
      })
      continue
    }
    if (willMatch) {
      out.push({
        text: willMatch[2]!.trim().replace(/[.;]+$/, ''),
        ownerLabel: willMatch[1]!.replace(/:$/, '').trim(),
        dueHint: willMatch[3]?.trim().replace(/[.;]+$/, '') ?? null,
      })
      continue
    }
    if (assignMatch) {
      out.push({
        text: (assignMatch[2] || 'Follow up').trim(),
        ownerLabel: assignMatch[1]!.trim(),
        dueHint: null,
      })
    }
  }

  return dedupeActions(out)
}

export function extractDecisionCandidates(transcript: string): string[] {
  const lines = transcript.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const decisions: string[] = []
  for (const line of lines) {
    const m = line.match(/^(?:decision|decided|we decided|agreed)\s*[:\-–]\s*(.+)$/i)
    if (m) decisions.push(m[1]!.trim())
  }
  return decisions
}

function dedupeActions(items: ActionCandidate[]): ActionCandidate[] {
  const seen = new Set<string>()
  const result: ActionCandidate[] = []
  for (const item of items) {
    const key = fingerprintDecision(`${item.ownerLabel ?? ''}|${item.text}`)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

/** Merge open threads that share fingerprints (recurring decisions). */
export function mergeThreadFingerprints(
  existing: Array<{ id: string; fingerprint: string; status: string }>,
  incomingFingerprint: string,
): string | null {
  if (!incomingFingerprint) return null
  for (const row of existing) {
    if (row.status === 'closed') continue
    if (shouldMergeByFingerprint(row.fingerprint, incomingFingerprint)) return row.id
  }
  return null
}
