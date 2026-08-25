---
name: voice2doc-testing
description: Adds and runs Vitest unit tests for Voice2Doc pure helper functions. Use when implementing features that need tests, fixing test failures, or adding coverage for src/lib or server pure helpers.
---

# Voice2Doc testing

## Config

- Runner: Vitest (`vitest.config.ts`)
- Command: `npm test` (single run) or `npm run test:watch`
- Include: `src/**/*.test.ts`, `server/src/**/*.test.ts`
- Environment: `node` (no jsdom unless added later)

## What to test

| Test | Location |
|------|----------|
| Pure transforms, scoring, parsing | `src/lib/<module>.test.ts` |
| Server mirror of shared logic | `server/src/lib/<module>.test.ts` OR prefer single copy in `src/lib/` |

Do **not** unit-test Express routes or React components unless asked — focus on deterministic pure functions.

## Test file template

```typescript
import { describe, expect, it } from 'vitest'
import { myHelper } from './myHelper'

describe('myHelper', () => {
  it('handles the happy path', () => {
    expect(myHelper('input')).toBe('expected')
  })

  it('handles edge cases', () => {
    expect(myHelper('')).toEqual([])
  })
})
```

## After changes

1. Run `npm test` — all must pass
2. Run `npm run build` — includes `tsc --noEmit`

## Existing test files (reference)

- `src/lib/memoryGraph.test.ts`
- `src/lib/echoScore.test.ts`
- `src/lib/voiceTwin.test.ts`
- `src/lib/compliance.test.ts`
- `src/lib/collab.test.ts`
- `src/theme/theme.test.ts`

When adding a phase with new pure helpers, add a matching `*.test.ts` in the same commit.
