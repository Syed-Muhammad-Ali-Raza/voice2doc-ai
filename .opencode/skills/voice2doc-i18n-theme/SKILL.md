---
name: voice2doc-i18n-theme
description: Adds translations, RTL locale support, and Studio Glass theme tokens for Voice2Doc. Use when adding UI strings, new locales, accent palettes, typography pairs, or theme-related settings.
---

# Voice2Doc i18n & theme

## Internationalization

- Engine: `i18next` + `react-i18next` (`src/i18n/index.ts`)
- Hook: `const t = useT()` → `t('section.key')` or `t('key', { count: 3 })`
- **Always add keys to `src/i18n/locales/en.ts` first** when shipping English UI
- Other locales (`es`, `fr`, `de`, `ur`, `ar`) may lag; English is source of truth
- RTL: Urdu (`ur`) and Arabic (`ar`) set `dir: 'rtl'` via `localeMeta`

### Adding strings

```typescript
// src/i18n/locales/en.ts
export const en: MessageTree = {
  myFeature: {
    title: 'My Feature',
    save: 'Save',
  },
}
```

Use in components: `t('myFeature.title')`.

## Theme (Phase 6)

- Accents: `src/theme/palettes.ts` — warm/neutral only (amber, teal, clay, brass, sage, copper)
- Typography: `src/theme/typography.ts`
- Apply: `applyStudioTheme()` in `src/theme/applyTheme.ts` sets CSS vars on `<html>`
- User prefs persist in Zustand + `PUT /api/preferences`

CSS vars used across app:

- `--color-accent`, `--studio-accent-rgb`, `--font-display`, `--font-sans`

## UI rules

- Studio Glass identity — not generic purple gradient SaaS
- Brand wordmark visible; one primary action per screen
- Use existing utility classes: `btn-primary`, `btn-ghost`, `glass`, `input-field`

## Settings page

Locale + accent + typography selectors live in `src/pages/SettingsPage.tsx`. Public header also has language dropdown in `PublicLayout.tsx`.
