/**
 * Document Atelier helpers (Phase 8) — brand kits + tone DNA.
 */

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

/** Wrap document HTML in a printable studio letterhead. */
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

/** Build an LLM/system style prompt fragment from Tone DNA. */
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

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
