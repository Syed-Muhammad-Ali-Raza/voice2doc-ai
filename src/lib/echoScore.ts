/**
 * Pure Echo Score helpers (Phase 12).
 * Compare spoken transcript intent against a finished draft.
 */

export type EchoPhraseKind = 'commitment' | 'action' | 'detail' | 'topic'

export interface EchoIntentPhrase {
  text: string
  kind: EchoPhraseKind
}

export interface LostPhrase extends EchoIntentPhrase {
  reason: EchoPhraseKind
}

export type EchoTipId =
  | 'restore_commitments'
  | 'restore_actions'
  | 'restore_details'
  | 'low_coverage'
  | 'high_fidelity'
  | 'no_transcript'
  | 'empty_draft'

export interface EchoTip {
  id: EchoTipId
  count?: number
}

export interface EchoScoreResult {
  score: number
  coverage: number
  keptCount: number
  totalCount: number
  lostPhrases: LostPhrase[]
  tips: EchoTip[]
}

const STOP = new Set([
  'the',
  'a',
  'an',
  'to',
  'for',
  'and',
  'or',
  'of',
  'in',
  'on',
  'at',
  'we',
  'i',
  'you',
  'they',
  'our',
  'your',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'that',
  'this',
  'with',
  'as',
  'by',
  'from',
  'it',
  'its',
  'also',
  'just',
  'very',
  'about',
  'into',
  'than',
  'then',
])

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function significantTokens(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((t) => t.length > 2 && !STOP.has(t))
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim().replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, ''))
    .filter((s) => significantTokens(s).length >= 3)
}

function classifyPhrase(text: string): EchoPhraseKind {
  const lower = text.toLowerCase()
  if (
    /^(?:action(?:\s*item)?|todo|follow[- ]?up)\s*[:\-–]/i.test(text) ||
    /\bwill\b/.test(lower) ||
    /\bassign(?:ed)?\s+to\b/.test(lower)
  ) {
    return 'action'
  }
  if (/\b(decided|decision|should|need to|must|going to|let'?s|commit(?:ted)?)\b/.test(lower)) {
    return 'commitment'
  }
  if (/\b(\d+|\$\d+|q[1-4]|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|june|july|august|september|october|november|december)\b/i.test(text)) {
    return 'detail'
  }
  return 'topic'
}

export function extractIntentPhrases(transcript: string): EchoIntentPhrase[] {
  const seen = new Set<string>()
  const out: EchoIntentPhrase[] = []
  for (const sentence of splitSentences(transcript)) {
    const key = normalizeText(sentence).slice(0, 160)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ text: sentence.replace(/[.;]+$/, '').trim(), kind: classifyPhrase(sentence) })
  }
  return out.slice(0, 24)
}

export function phraseCoverage(phrase: string, draftNorm: string): number {
  const tokens = significantTokens(phrase)
  if (tokens.length === 0) return 1
  if (draftNorm.includes(normalizeText(phrase)) && normalizeText(phrase).length > 12) return 1

  const hit = tokens.filter((tok) => draftNorm.includes(tok)).length
  const ratio = hit / tokens.length

  // Reward contiguous bigrams that survive into the draft.
  let bigramHits = 0
  let bigramTotal = 0
  for (let i = 0; i < tokens.length - 1; i++) {
    bigramTotal += 1
    if (draftNorm.includes(`${tokens[i]} ${tokens[i + 1]}`)) bigramHits += 1
  }
  const bigramRatio = bigramTotal === 0 ? ratio : bigramHits / bigramTotal
  return Math.min(1, ratio * 0.7 + bigramRatio * 0.3)
}

function tokenCoverage(source: string, draftNorm: string): number {
  const tokens = significantTokens(source)
  if (tokens.length === 0) return 1
  const hit = tokens.filter((tok) => draftNorm.includes(tok)).length
  return hit / tokens.length
}

export function scoreBand(score: number): 'low' | 'mid' | 'high' {
  if (score >= 80) return 'high'
  if (score >= 55) return 'mid'
  return 'low'
}

export function computeEchoScore(transcript: string, draftHtml: string): EchoScoreResult {
  const spoken = transcript.trim()
  const draftText = stripHtml(draftHtml)

  if (!spoken || /^no audio attached/i.test(spoken)) {
    return {
      score: 0,
      coverage: 0,
      keptCount: 0,
      totalCount: 0,
      lostPhrases: [],
      tips: [{ id: 'no_transcript' }],
    }
  }

  if (!draftText) {
    return {
      score: 0,
      coverage: 0,
      keptCount: 0,
      totalCount: 0,
      lostPhrases: [],
      tips: [{ id: 'empty_draft' }],
    }
  }

  const draftNorm = normalizeText(draftText)
  const phrases = extractIntentPhrases(spoken)
  const lostPhrases: LostPhrase[] = []
  let weightedKept = 0
  let weightedTotal = 0

  const weightFor = (kind: EchoPhraseKind) =>
    kind === 'action' || kind === 'commitment' ? 1.4 : kind === 'detail' ? 1.15 : 1

  if (phrases.length === 0) {
    const coverage = tokenCoverage(spoken, draftNorm)
    const score = Math.round(coverage * 100)
    return {
      score,
      coverage,
      keptCount: score >= 55 ? 1 : 0,
      totalCount: 1,
      lostPhrases: [],
      tips: score >= 80 ? [{ id: 'high_fidelity' }] : [{ id: 'low_coverage' }],
    }
  }

  for (const phrase of phrases) {
    const weight = weightFor(phrase.kind)
    weightedTotal += weight
    const coverage = phraseCoverage(phrase.text, draftNorm)
    if (coverage >= 0.55) {
      weightedKept += weight
    } else {
      lostPhrases.push({ ...phrase, reason: phrase.kind })
    }
  }

  const coverage = weightedTotal === 0 ? 1 : weightedKept / weightedTotal
  const score = Math.max(0, Math.min(100, Math.round(coverage * 100)))
  const keptCount = phrases.length - lostPhrases.length

  const tips: EchoTip[] = []
  const lostActions = lostPhrases.filter((p) => p.kind === 'action').length
  const lostCommitments = lostPhrases.filter((p) => p.kind === 'commitment').length
  const lostDetails = lostPhrases.filter((p) => p.kind === 'detail').length

  if (lostCommitments > 0) tips.push({ id: 'restore_commitments', count: lostCommitments })
  if (lostActions > 0) tips.push({ id: 'restore_actions', count: lostActions })
  if (lostDetails > 0) tips.push({ id: 'restore_details', count: lostDetails })
  if (score >= 80 && tips.length === 0) tips.push({ id: 'high_fidelity' })
  if (score < 55 && tips.length === 0) tips.push({ id: 'low_coverage' })

  return {
    score,
    coverage,
    keptCount,
    totalCount: phrases.length,
    lostPhrases: lostPhrases.slice(0, 8),
    tips,
  }
}
