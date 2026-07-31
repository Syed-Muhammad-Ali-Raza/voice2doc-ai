import { v4 as uuid } from 'uuid'
import { db } from '../db.js'

export interface BrandKitInput {
  name: string
  accentHex: string
  logoText: string
  footerLine: string
  letterheadTitle: string
}

export interface ToneDnaInput {
  name: string
  voiceSummary: string
  doList: string[]
  dontList: string[]
  sampleOpening: string
}

export function normalizeAccentHex(hex: string): string {
  const raw = hex.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`
  return '#c47b2d'
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function applyBrandLetterhead(html: string, kit: BrandKitInput): string {
  const accent = normalizeAccentHex(kit.accentHex)
  return `<article class="atelier-letterhead" style="font-family:inherit;color:inherit">
<header style="border-bottom:2px solid ${accent};padding-bottom:12px;margin-bottom:20px">
  <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${accent}">${escapeHtml(kit.logoText || 'Voice2Doc')}</p>
  <h1 style="margin:8px 0 0;font-size:22px">${escapeHtml(kit.letterheadTitle || kit.name)}</h1>
</header>
<div class="atelier-body">${html}</div>
<footer style="margin-top:28px;padding-top:12px;border-top:1px solid ${accent}55;font-size:12px;opacity:0.8">${escapeHtml(kit.footerLine || '')}</footer>
</article>`
}

export function buildToneDnaPrompt(dna: ToneDnaInput): string {
  const dos = dna.doList.filter(Boolean).map((d) => `- ${d}`).join('\n')
  const donts = dna.dontList.filter(Boolean).map((d) => `- ${d}`).join('\n')
  return [
    `Tone DNA: ${dna.name}`,
    dna.voiceSummary,
    dos ? `Do:\n${dos}` : '',
    donts ? `Don't:\n${donts}` : '',
    dna.sampleOpening ? `Sample opening: "${dna.sampleOpening}"` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function scoreToneFit(sample: string, dna: ToneDnaInput): number {
  const hay = sample.toLowerCase()
  let score = 50
  for (const d of dna.doList) {
    const token = d.toLowerCase().split(/\s+/)[0]
    if (token && hay.includes(token)) score += 8
  }
  for (const d of dna.dontList) {
    const token = d.toLowerCase().split(/\s+/)[0]
    if (token && hay.includes(token)) score -= 12
  }
  if (dna.sampleOpening && hay.includes(dna.sampleOpening.slice(0, 12).toLowerCase())) score += 10
  return Math.max(0, Math.min(100, score))
}

export function migrateAtelierTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brand_kits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      accent_hex TEXT NOT NULL,
      logo_text TEXT NOT NULL,
      footer_line TEXT NOT NULL,
      letterhead_title TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tone_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      voice_summary TEXT NOT NULL,
      do_json TEXT NOT NULL,
      dont_json TEXT NOT NULL,
      sample_opening TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_brand_kits_user ON brand_kits(user_id);
    CREATE INDEX IF NOT EXISTS idx_tone_profiles_user ON tone_profiles(user_id);
  `)
}

function parseList(json: string): string[] {
  try {
    const v = JSON.parse(json) as unknown
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

export function ensureDemoAtelier(userId: string) {
  const kits = db.prepare('SELECT COUNT(*) as c FROM brand_kits WHERE user_id = ?').get(userId) as {
    c: number
  }
  if (kits.c === 0) {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO brand_kits (id, user_id, name, accent_hex, logo_text, footer_line, letterhead_title, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(
      uuid(),
      userId,
      'Studio Amber Letterhead',
      '#c47b2d',
      'Voice2Doc Studio',
      'Confidential — generated with Voice2Doc AI',
      'Studio Document',
      now,
      now,
    )
  }

  const tones = db.prepare('SELECT COUNT(*) as c FROM tone_profiles WHERE user_id = ?').get(userId) as {
    c: number
  }
  if (tones.c === 0) {
    const now = new Date().toISOString()
    const seed: ToneDnaInput[] = [
      {
        name: 'Board brief',
        voiceSummary: 'Crisp executive summary. Lead with decision, then risk, then ask.',
        doList: ['Lead with the decision', 'Use short paragraphs', 'Name owners'],
        dontList: ['Hedging language', 'Long anecdotes', 'Emoji'],
        sampleOpening: 'Recommendation: proceed with the staged rollout.',
      },
      {
        name: 'Customer email',
        voiceSummary: 'Warm, clear, and actionable without jargon.',
        doList: ['Thank the reader', 'One clear next step', 'Friendly closings'],
        dontList: ['Blame', 'Internal slang', 'Walls of text'],
        sampleOpening: 'Thanks for your patience — here is the update you asked for.',
      },
    ]
    for (const [i, t] of seed.entries()) {
      db.prepare(
        `INSERT INTO tone_profiles (id, user_id, name, voice_summary, do_json, dont_json, sample_opening, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        uuid(),
        userId,
        t.name,
        t.voiceSummary,
        JSON.stringify(t.doList),
        JSON.stringify(t.dontList),
        t.sampleOpening,
        i === 0 ? 1 : 0,
        now,
        now,
      )
    }
  }
}

export function listBrandKits(userId: string) {
  ensureDemoAtelier(userId)
  return (
    db
      .prepare(
        `SELECT id, name, accent_hex, logo_text, footer_line, letterhead_title, is_default, created_at, updated_at
         FROM brand_kits WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC`,
      )
      .all(userId) as Array<{
      id: string
      name: string
      accent_hex: string
      logo_text: string
      footer_line: string
      letterhead_title: string
      is_default: number
      created_at: string
      updated_at: string
    }>
  ).map((r) => ({
    id: r.id,
    name: r.name,
    accentHex: r.accent_hex,
    logoText: r.logo_text,
    footerLine: r.footer_line,
    letterheadTitle: r.letterhead_title,
    isDefault: Boolean(r.is_default),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export function listToneProfiles(userId: string) {
  ensureDemoAtelier(userId)
  return (
    db
      .prepare(
        `SELECT id, name, voice_summary, do_json, dont_json, sample_opening, is_default, created_at, updated_at
         FROM tone_profiles WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC`,
      )
      .all(userId) as Array<{
      id: string
      name: string
      voice_summary: string
      do_json: string
      dont_json: string
      sample_opening: string
      is_default: number
      created_at: string
      updated_at: string
    }>
  ).map((r) => ({
    id: r.id,
    name: r.name,
    voiceSummary: r.voice_summary,
    doList: parseList(r.do_json),
    dontList: parseList(r.dont_json),
    sampleOpening: r.sample_opening,
    isDefault: Boolean(r.is_default),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    prompt: buildToneDnaPrompt({
      name: r.name,
      voiceSummary: r.voice_summary,
      doList: parseList(r.do_json),
      dontList: parseList(r.dont_json),
      sampleOpening: r.sample_opening,
    }),
  }))
}

export function createBrandKit(userId: string, input: BrandKitInput & { isDefault?: boolean }) {
  const id = uuid()
  const now = new Date().toISOString()
  if (input.isDefault) {
    db.prepare('UPDATE brand_kits SET is_default = 0 WHERE user_id = ?').run(userId)
  }
  db.prepare(
    `INSERT INTO brand_kits (id, user_id, name, accent_hex, logo_text, footer_line, letterhead_title, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.name,
    normalizeAccentHex(input.accentHex),
    input.logoText,
    input.footerLine,
    input.letterheadTitle,
    input.isDefault ? 1 : 0,
    now,
    now,
  )
  return listBrandKits(userId).find((k) => k.id === id)!
}

export function createToneProfile(userId: string, input: ToneDnaInput & { isDefault?: boolean }) {
  const id = uuid()
  const now = new Date().toISOString()
  if (input.isDefault) {
    db.prepare('UPDATE tone_profiles SET is_default = 0 WHERE user_id = ?').run(userId)
  }
  db.prepare(
    `INSERT INTO tone_profiles (id, user_id, name, voice_summary, do_json, dont_json, sample_opening, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.name,
    input.voiceSummary,
    JSON.stringify(input.doList),
    JSON.stringify(input.dontList),
    input.sampleOpening,
    input.isDefault ? 1 : 0,
    now,
    now,
  )
  return listToneProfiles(userId).find((t) => t.id === id)!
}

export function previewExport(
  userId: string,
  opts: { contentHtml: string; brandKitId?: string; toneProfileId?: string },
) {
  const kits = listBrandKits(userId)
  const tones = listToneProfiles(userId)
  const kit = opts.brandKitId
    ? kits.find((k) => k.id === opts.brandKitId)
    : kits.find((k) => k.isDefault) || kits[0]
  const tone = opts.toneProfileId
    ? tones.find((t) => t.id === opts.toneProfileId)
    : tones.find((t) => t.isDefault) || tones[0]

  const branded = kit
    ? applyBrandLetterhead(opts.contentHtml, {
        name: kit.name,
        accentHex: kit.accentHex,
        logoText: kit.logoText,
        footerLine: kit.footerLine,
        letterheadTitle: kit.letterheadTitle,
      })
    : opts.contentHtml

  const fit = tone
    ? scoreToneFit(opts.contentHtml.replace(/<[^>]+>/g, ' '), {
        name: tone.name,
        voiceSummary: tone.voiceSummary,
        doList: tone.doList,
        dontList: tone.dontList,
        sampleOpening: tone.sampleOpening,
      })
    : null

  return {
    html: branded,
    brandKit: kit ?? null,
    toneProfile: tone ?? null,
    toneFitScore: fit,
  }
}
