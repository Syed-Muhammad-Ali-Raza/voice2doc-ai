import { describe, expect, it } from 'vitest'
import {
  formatVoiceTimestamp,
  mirrorCommentIntoHtml,
  parseVoiceTimestamp,
  presenceColor,
  removeMirroredComment,
} from './collab'

describe('collab timestamps', () => {
  it('formats and parses voice time', () => {
    expect(formatVoiceTimestamp(95_000)).toBe('1:35')
    expect(parseVoiceTimestamp('1:35')).toBe(95_000)
    expect(parseVoiceTimestamp('bad')).toBeNull()
  })
})

describe('comment mirroring', () => {
  it('inserts aside after first block', () => {
    const html = mirrorCommentIntoHtml('<p>Hello</p><p>World</p>', {
      id: 'c1',
      authorName: 'Alex',
      body: 'Check this',
      timestampMs: 45000,
    })
    expect(html).toContain('data-collab-comment="c1"')
    expect(html).toContain('@0:45')
    expect(html.indexOf('Hello')).toBeLessThan(html.indexOf('collab-comment'))
  })

  it('removes mirrored aside', () => {
    const html = mirrorCommentIntoHtml('<p>Hello</p>', {
      id: 'c1',
      authorName: 'Alex',
      body: 'Note',
      timestampMs: 0,
    })
    expect(removeMirroredComment(html, 'c1')).not.toContain('data-collab-comment')
  })
})

describe('presenceColor', () => {
  it('is stable for a user id', () => {
    expect(presenceColor('user-a')).toBe(presenceColor('user-a'))
  })
})
