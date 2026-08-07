/** Pure Voice Twin helpers for the API (Phase 13). */

export interface WritingMarkers {
  avgSentenceLen: number
  formality: number
  hedgeRate: number
  firstPersonRate: number
  imperativeRate: number
  sampleCount: number
  wordCount: number
}

export interface VoiceTwinProfile {
  voiceSummary: string
  doList: string[]
  dontList: string[]
  sampleOpening: string
  markers: WritingMarkers
}

const HEDGE = ['maybe', 'perhaps', 'might', 'could', 'somewhat', 'kind of', 'sort of', 'possibly', 'i think', 'i feel']
const FORMAL = ['therefore', 'regarding', 'pursuant', 'recommend', 'accordingly', 'furthermore', 'however', 'moreover']
const CASUAL = ["let's", 'gonna', 'hey', 'folks', 'quick', 'anyway', 'btw', 'cool']
const STOP = new Set(['the', 'a', 'an', 'to', 'for', 'and', 'or', 'of', 'in', 'on', 'at', 'is', 'are', 'was', 'were'])

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

export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 3)
}

function countMatches(hay: string, phrases: string[]): number {
  let n = 0
  for (const p of phrases) {
    const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const m = hay.match(re)
    if (m) n += m.length
  }
  return n
}

export function analyzeWritingSamples(samples: string[]): WritingMarkers {
  const texts = samples.map((s) => stripHtml(s)).filter((s) => s.length > 20)
  const joined = texts.join(' ')
  const sentences = texts.flatMap(splitSentences)
  const words = joined.toLowerCase().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const avgSentenceLen =
    sentences.length === 0
      ? 12
      : sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length

  const hedgeHits = countMatches(joined.toLowerCase(), HEDGE)
  const formalHits = countMatches(joined.toLowerCase(), FORMAL)
  const casualHits = countMatches(joined.toLowerCase(), CASUAL)
  const firstPerson = countMatches(joined.toLowerCase(), ['i ', ' we ', "i'm", "we're", 'my ', 'our '])
  const imperative = sentences.filter(
    (s) => /^(please\s+)?[A-Z][a-z]+\b/.test(s) && !/^(The|This|That|We|I|It|There)\b/.test(s),
  ).length

  const formalityRaw = 50 + formalHits * 8 - casualHits * 10 - hedgeHits * 4
  const formality = Math.max(0, Math.min(100, Math.round(formalityRaw)))

  return {
    avgSentenceLen: Math.round(avgSentenceLen * 10) / 10,
    formality,
    hedgeRate: wordCount === 0 ? 0 : Math.round((hedgeHits / Math.max(1, sentences.length)) * 100) / 100,
    firstPersonRate: sentences.length === 0 ? 0 : Math.round((firstPerson / sentences.length) * 100) / 100,
    imperativeRate: sentences.length === 0 ? 0 : Math.round((imperative / sentences.length) * 100) / 100,
    sampleCount: texts.length,
    wordCount,
  }
}

export function pickSampleOpening(samples: string[]): string {
  for (const sample of samples) {
    const text = stripHtml(sample)
    const first = splitSentences(text)[0]
    if (first && first.length > 12 && first.length < 180) return first.replace(/[.;]+$/, '').trim()
  }
  return 'Here is the concise update.'
}

export function frequentLeadWords(samples: string[], limit = 5): string[] {
  const counts = new Map<string, number>()
  for (const sample of samples) {
    for (const sentence of splitSentences(stripHtml(sample))) {
      const first = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/)[0]
      if (!first || STOP.has(first) || first.length < 3) continue
      counts.set(first, (counts.get(first) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w)
}

export function buildVoiceTwinProfile(samples: string[], memoryHints: string[] = []): VoiceTwinProfile {
  const markers = analyzeWritingSamples(samples)
  const opening = pickSampleOpening(samples)
  const leads = frequentLeadWords(samples)
  const doList: string[] = []
  const dontList: string[] = []

  if (markers.avgSentenceLen <= 14) doList.push('Prefer short, decisive sentences')
  else doList.push('Allow fuller explanatory sentences when needed')

  if (markers.formality >= 60) {
    doList.push('Keep a professional, board-ready register')
    dontList.push('Casual slang or filler')
  } else {
    doList.push('Keep a warm, conversational register')
    dontList.push('Overly stiff legal phrasing')
  }

  if (markers.hedgeRate > 0.35) {
    dontList.push('Extra hedging (maybe / perhaps / I think)')
    doList.push('State recommendations directly')
  } else {
    doList.push('Lead with clear recommendations')
    dontList.push('Unnecessary uncertainty')
  }

  if (markers.firstPersonRate > 0.4) doList.push('Use first person when ownership matters')
  else doList.push('Prefer team or outcome framing over “I”')

  if (markers.imperativeRate > 0.25) doList.push('Use clear action verbs for next steps')
  if (leads[0]) doList.push(`Natural openings often start with “${leads[0]}”`)

  for (const hint of memoryHints.slice(0, 3)) {
    if (hint.trim()) doList.push(`Reflect recurring decision theme: ${hint.trim().slice(0, 80)}`)
  }

  const voiceSummary = [
    markers.formality >= 60 ? 'Formal and precise' : 'Approachable and direct',
    markers.avgSentenceLen <= 14 ? 'compact sentences' : 'developed sentences',
    markers.hedgeRate > 0.35 ? 'occasionally hedged' : 'low hedging',
    markers.firstPersonRate > 0.4 ? 'personal ownership voice' : 'collective / outcome voice',
  ].join('; ')

  return {
    voiceSummary,
    doList: [...new Set(doList)].slice(0, 6),
    dontList: [...new Set(dontList)].slice(0, 5),
    sampleOpening: opening,
    markers,
  }
}

export function buildVoiceTwinPrompt(name: string, twin: VoiceTwinProfile): string {
  return [
    `Voice Twin: ${name}`,
    twin.voiceSummary,
    `Do:\n${twin.doList.map((d) => `- ${d}`).join('\n')}`,
    `Don't:\n${twin.dontList.map((d) => `- ${d}`).join('\n')}`,
    `Sample opening: "${twin.sampleOpening}"`,
    `Markers: avgSentence=${twin.markers.avgSentenceLen}, formality=${twin.markers.formality}, hedgeRate=${twin.markers.hedgeRate}`,
  ].join('\n\n')
}

export function applyVoiceTwinLocally(html: string, twin: VoiceTwinProfile): string {
  let next = html
  if (twin.markers.hedgeRate < 0.35) {
    next = next
      .replace(/\bI think\b/gi, '')
      .replace(/\bmaybe\b/gi, '')
      .replace(/\bperhaps\b/gi, '')
      .replace(/\s{2,}/g, ' ')
  }
  const note = `<p><em>Voice Twin applied — ${escapeHtml(twin.voiceSummary)}.</em></p>`
  if (twin.sampleOpening && !stripHtml(next).toLowerCase().includes(twin.sampleOpening.slice(0, 18).toLowerCase())) {
    next = `<p>${escapeHtml(twin.sampleOpening)}</p>${next}`
  }
  if (!next.includes('Voice Twin applied')) next = `${note}${next}`
  return next
}

export function scoreVoiceMatch(sampleHtml: string, twin: VoiceTwinProfile): number {
  const text = stripHtml(sampleHtml).toLowerCase()
  const markers = analyzeWritingSamples([sampleHtml])
  let score = 55

  const formalityDelta = Math.abs(markers.formality - twin.markers.formality)
  score -= Math.min(25, Math.round(formalityDelta / 4))

  const lenDelta = Math.abs(markers.avgSentenceLen - twin.markers.avgSentenceLen)
  score -= Math.min(15, Math.round(lenDelta))

  for (const d of twin.doList) {
    const token = d.toLowerCase().split(/\s+/).find((w) => w.length > 4)
    if (token && text.includes(token)) score += 4
  }
  for (const d of twin.dontList) {
    const token = d.toLowerCase().split(/\s+/).find((w) => w.length > 4)
    if (token && text.includes(token)) score -= 6
  }
  if (twin.sampleOpening && text.includes(twin.sampleOpening.slice(0, 12).toLowerCase())) score += 8

  return Math.max(0, Math.min(100, score))
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
