# Agent Skills (cross-IDE)

Voice2Doc uses the [Agent Skills](https://agentskills.io) open standard. **Canonical skills live here:**

```
.agents/skills/<skill-name>/SKILL.md
```

## Supported IDEs

| IDE / agent | Project skills path | Notes |
|-------------|---------------------|-------|
| **Cursor** | `.cursor/skills/` | Also reads `.agents/skills/` natively |
| **VS Code + Copilot** | `.github/skills/` | Also reads `.agents/skills/` |
| **Windsurf** | `.windsurf/skills/` | Cascade agent |
| **OpenCode** | `.opencode/skills/` | Also reads `.agents/skills/` |
| **Antigravity** | `.agents/skills/` | Legacy: `.agent/skills/` |
| **Claude Code / Codex** | `.claude/skills/` | Compatibility mirror |

Mirrors are generated from `.agents/skills/` — do not edit copies by hand.

## Sync mirrors

After changing a skill under `.agents/skills/`:

```bash
npm run sync:skills
```

This copies every skill folder into IDE-specific directories so the same `SKILL.md` works everywhere.

## Always-on project context

Root [`AGENTS.md`](../AGENTS.md) applies to VS Code, Cursor, Windsurf, OpenCode, and Antigravity for repo-wide conventions (stack, phases, quality bar).

## Add a new skill

1. Create `.agents/skills/my-skill/SKILL.md` with YAML frontmatter (`name`, `description`).
2. Run `npm run sync:skills`.
3. Commit `.agents/skills/` **and** the generated mirror folders.

## Bundled skills

| Skill | Use when |
|-------|----------|
| `voice2doc-phase-delivery` | Implementing the next product phase |
| `voice2doc-stack-patterns` | Frontend/backend module layout & API conventions |
| `voice2doc-testing` | Adding Vitest coverage for pure helpers |
| `voice2doc-i18n-theme` | Locales, RTL, Studio Glass theme tokens |
