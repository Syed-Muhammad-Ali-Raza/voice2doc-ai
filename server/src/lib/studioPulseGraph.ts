/** Pure Studio Pulse helpers for the API (Phase 15). */

export type PulseItemKind = 'action' | 'echo' | 'thread' | 'doc' | 'voice'

export interface PulseItem {
  id: string
  kind: PulseItemKind
  title: string
  detail?: string
  href?: string
  score?: number
  priority: number
  at?: string
}

export interface PulseStats {
  docsUpdatedWeek: number
  openThreads: number
  openActions: number
  lowEchoCount: number
  voiceCommandsWeek: number
}

export interface PulseBrief {
  headline: string
  summary: string
  focusItems: PulseItem[]
  stats: PulseStats
  generatedAt: string
}

export function prioritizePulseItems(items: PulseItem[]): PulseItem[] {
  return [...items].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    const atA = a.at ? new Date(a.at).getTime() : 0
    const atB = b.at ? new Date(b.at).getTime() : 0
    return atB - atA
  })
}

export function buildPulseBrief(items: PulseItem[], stats: PulseStats, now = new Date()): PulseBrief {
  const focusItems = prioritizePulseItems(items).slice(0, 8)

  let headline = 'Your studio is quiet'
  if (stats.openActions > 0) {
    headline = `${stats.openActions} open action${stats.openActions === 1 ? '' : 's'} need attention`
  } else if (stats.lowEchoCount > 0) {
    headline = `${stats.lowEchoCount} draft${stats.lowEchoCount === 1 ? '' : 's'} may have lost spoken intent`
  } else if (stats.docsUpdatedWeek > 0) {
    headline = `${stats.docsUpdatedWeek} document${stats.docsUpdatedWeek === 1 ? '' : 's'} touched this week`
  }

  const parts: string[] = []
  if (stats.openActions > 0) parts.push(`${stats.openActions} memory actions still open`)
  if (stats.lowEchoCount > 0) parts.push(`${stats.lowEchoCount} low Echo Score alerts`)
  if (stats.openThreads > 0) parts.push(`${stats.openThreads} active memory threads`)
  if (stats.voiceCommandsWeek > 0) parts.push(`${stats.voiceCommandsWeek} voice commands this week`)

  const summary =
    parts.length > 0 ? parts.join(' · ') : 'Capture audio or open a draft to get started.'

  return {
    headline,
    summary,
    focusItems,
    stats,
    generatedAt: now.toISOString(),
  }
}
