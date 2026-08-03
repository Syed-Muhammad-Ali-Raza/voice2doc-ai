/**
 * Live Studio Collab helpers (Phase 9) — timestamp comments + doc mirroring.
 */

export function formatVoiceTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseVoiceTimestamp(label: string): number | null {
  const m = label.trim().match(/^(\d{1,3}):([0-5]\d)$/)
  if (!m) return null
  return (Number(m[1]) * 60 + Number(m[2])) * 1000
}

/** Insert a collab marker block into HTML so comments mirror into the formatted doc. */
export function mirrorCommentIntoHtml(
  html: string,
  comment: { id: string; authorName: string; body: string; timestampMs: number },
): string {
  const stamp = formatVoiceTimestamp(comment.timestampMs)
  const block = `<aside data-collab-comment="${escapeAttr(comment.id)}" class="collab-comment" style="border-left:3px solid var(--color-accent,#c47b2d);padding:8px 12px;margin:12px 0;opacity:0.95"><p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.7">@${escapeHtml(stamp)} · ${escapeHtml(comment.authorName)}</p><p style="margin:4px 0 0">${escapeHtml(comment.body)}</p></aside>`
  if (!html.trim()) return block
  // Prefer inserting after first paragraph/heading if present
  const match = html.match(/<\/(p|h1|h2|h3)>/i)
  if (!match || match.index === undefined) return `${html}${block}`
  const insertAt = match.index + match[0].length
  return `${html.slice(0, insertAt)}${block}${html.slice(insertAt)}`
}

export function removeMirroredComment(html: string, commentId: string): string {
  const re = new RegExp(
    `<aside[^>]*data-collab-comment="${escapeRegExp(commentId)}"[^>]*>[\\s\\S]*?<\\/aside>`,
    'i',
  )
  return html.replace(re, '')
}

export function presenceColor(userId: string): string {
  const palette = ['#c47b2d', '#1f7a74', '#b85c38', '#8a7340', '#5a7a5e', '#a65d45', '#2f4a5e']
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]!
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replaceAll("'", '&#39;')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
