import { describe, expect, it } from 'vitest'
import { buildPulseBrief, prioritizePulseItems, type PulseItem, type PulseStats } from './studioPulse'

const emptyStats: PulseStats = {
  docsUpdatedWeek: 0,
  openThreads: 0,
  openActions: 0,
  lowEchoCount: 0,
  voiceCommandsWeek: 0,
}

describe('prioritizePulseItems', () => {
  it('sorts by priority then recency', () => {
    const items: PulseItem[] = [
      { id: '1', kind: 'doc', title: 'Old doc', priority: 40, at: '2026-01-01T00:00:00Z' },
      { id: '2', kind: 'action', title: 'Action', priority: 90, at: '2026-01-02T00:00:00Z' },
      { id: '3', kind: 'echo', title: 'Echo', priority: 80, at: '2026-01-03T00:00:00Z' },
    ]
    const sorted = prioritizePulseItems(items)
    expect(sorted.map((x) => x.id)).toEqual(['2', '3', '1'])
  })
})

describe('buildPulseBrief', () => {
  it('prioritizes open actions in headline', () => {
    const stats: PulseStats = { ...emptyStats, openActions: 3, openThreads: 2 }
    const brief = buildPulseBrief([], stats, new Date('2026-08-24T10:00:00Z'))
    expect(brief.headline).toBe('3 open actions need attention')
    expect(brief.summary).toContain('3 memory actions still open')
    expect(brief.generatedAt).toBe('2026-08-24T10:00:00.000Z')
  })

  it('surfaces low echo when no actions', () => {
    const stats: PulseStats = { ...emptyStats, lowEchoCount: 2 }
    const brief = buildPulseBrief([], stats)
    expect(brief.headline).toBe('2 drafts may have lost spoken intent')
  })

  it('limits focus items to eight', () => {
    const items: PulseItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      kind: 'doc' as const,
      title: `Doc ${i}`,
      priority: 40 + i,
    }))
    const brief = buildPulseBrief(items, { ...emptyStats, docsUpdatedWeek: 12 })
    expect(brief.focusItems).toHaveLength(8)
  })

  it('uses quiet studio message when empty', () => {
    const brief = buildPulseBrief([], emptyStats)
    expect(brief.headline).toBe('Your studio is quiet')
    expect(brief.summary).toContain('Capture audio')
  })
})
