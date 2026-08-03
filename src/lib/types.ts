export type PlanId = 'free' | 'pro' | 'business' | 'enterprise'

export type DocumentType =
  | 'Meeting Notes'
  | 'Email'
  | 'Report'
  | 'Blog Article'
  | 'Checklist'
  | 'Lecture Notes'
  | 'Daily Journal'
  | 'Project Documentation'
  | 'Proposal'
  | 'Brainstorm Notes'
  | 'Action Items'
  | 'Interview Transcript'
  | 'Research Summary'

export type Tone = 'Professional' | 'Friendly' | 'Formal' | 'Casual' | 'Academic'
export type Length = 'Short' | 'Medium' | 'Detailed'
export type Language = 'English' | 'Spanish' | 'French' | 'German' | 'Urdu' | 'Arabic'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface DocItem {
  id: string
  title: string
  type: DocumentType
  content: string
  favorite: boolean
  createdAt: string
  updatedAt: string
  language: Language
  tone: Tone
  ownerId?: string
  workspaceId?: string | null
}


export interface ProcessConfig {
  type: DocumentType
  tone: Tone
  length: Length
  language: Language
  speakerDetection: boolean
  source: 'record' | 'upload' | 'blank' | 'template'
  sourceLabel?: string
}

export interface UsageStats {
  minutesUsed: number
  minutesLimit: number
  docsCreated: number
  storageUsedMb: number
  storageLimitMb: number
  /** AI generations used (record/upload → process). Free plan capped by trialsLimit. */
  trialsUsed: number
  trialsLimit: number
}

export const DOCUMENT_TYPES: DocumentType[] = [
  'Meeting Notes',
  'Email',
  'Report',
  'Blog Article',
  'Checklist',
  'Lecture Notes',
  'Daily Journal',
  'Project Documentation',
  'Proposal',
  'Brainstorm Notes',
  'Action Items',
  'Interview Transcript',
  'Research Summary',
]

export const TONES: Tone[] = ['Professional', 'Friendly', 'Formal', 'Casual', 'Academic']
export const LENGTHS: Length[] = ['Short', 'Medium', 'Detailed']
export const LANGUAGES: Language[] = ['English', 'Spanish', 'French', 'German', 'Urdu', 'Arabic']

export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac'] as const
