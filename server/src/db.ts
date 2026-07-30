import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const dataDir = path.join(__dirname, '..', 'data')
export const uploadsDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(uploadsDir, { recursive: true })

const dbPath = path.join(dataDir, 'voice2doc.sqlite')
export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    trials_used INTEGER NOT NULL DEFAULT 0,
    trials_limit INTEGER NOT NULL DEFAULT 10,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    tone TEXT NOT NULL,
    language TEXT NOT NULL,
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

  CREATE TABLE IF NOT EXISTS audio_assets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    original_name TEXT,
    mime TEXT,
    size_bytes INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_id TEXT REFERENCES audio_assets(id),
    status TEXT NOT NULL,
    stage TEXT NOT NULL,
    stage_index INTEGER NOT NULL DEFAULT 0,
    config_json TEXT NOT NULL,
    transcript TEXT,
    document_id TEXT,
    error TEXT,
    provider TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    finished_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
`)
