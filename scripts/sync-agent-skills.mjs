#!/usr/bin/env node
/**
 * Mirror .agents/skills/* → IDE-specific skill directories.
 * Canonical source: .agents/skills/<name>/SKILL.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const source = path.join(root, '.agents', 'skills')

const targets = [
  '.cursor/skills',
  '.windsurf/skills',
  '.opencode/skills',
  '.github/skills',
  '.claude/skills',
  '.codex/skills',
  '.agent/skills',
]

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(from, to)
    else fs.copyFileSync(from, to)
  }
}

if (!fs.existsSync(source)) {
  console.error('Missing canonical skills folder:', source)
  process.exit(1)
}

const skills = fs.readdirSync(source, { withFileTypes: true }).filter((d) => d.isDirectory())
if (skills.length === 0) {
  console.warn('No skills found in', source)
}

for (const targetRel of targets) {
  const targetRoot = path.join(root, targetRel)
  rmDir(targetRoot)
  fs.mkdirSync(targetRoot, { recursive: true })

  for (const skill of skills) {
    const srcSkill = path.join(source, skill.name)
    const skillMd = path.join(srcSkill, 'SKILL.md')
    if (!fs.existsSync(skillMd)) {
      console.warn(`Skip ${skill.name}: no SKILL.md`)
      continue
    }
    copyDir(srcSkill, path.join(targetRoot, skill.name))
  }
  console.log(`Synced ${skills.length} skill(s) → ${targetRel}`)
}

console.log('Done. Edit skills only under .agents/skills/')
