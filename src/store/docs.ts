import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateMockDocument } from '../lib/mockAi'
import { seedDocuments } from '../lib/seed'
import { FREE_DOCUMENT_LIMIT } from '../config/plans'
import type { DocItem, DocumentType, Language, ProcessConfig, Tone, UsageStats } from '../lib/types'

const defaultUsage: UsageStats = {
  minutesUsed: 12,
  minutesLimit: 30,
  docsCreated: 3,
  storageUsedMb: 48,
  storageLimitMb: 500,
  trialsUsed: 0,
  trialsLimit: FREE_DOCUMENT_LIMIT,
}

interface DocsState {
  documents: DocItem[]
  usage: UsageStats
  pendingConfig: ProcessConfig | null
  pendingAudio: Blob | null
  toast: string | null
  setPendingConfig: (config: ProcessConfig | null) => void
  setPendingAudio: (audio: Blob | null) => void
  showToast: (message: string) => void
  clearToast: () => void
  setDocuments: (documents: DocItem[]) => void
  upsertDocument: (doc: DocItem) => DocItem
  setTrials: (trialsUsed: number, trialsLimit?: number) => void
  addDocument: (doc: Omit<DocItem, 'id' | 'createdAt' | 'updatedAt' | 'favorite'> & { favorite?: boolean; id?: string }) => DocItem
  updateDocument: (id: string, patch: Partial<DocItem>) => void
  deleteDocument: (id: string) => void
  duplicateDocument: (id: string) => void
  toggleFavorite: (id: string) => void
  createFromConfig: (config: ProcessConfig) => DocItem
  createBlank: () => DocItem
  createFromTemplate: (type: DocumentType, name: string) => DocItem
  bumpUsage: (minutes?: number) => void
  consumeTrial: () => void
}

function uid() {
  return `doc-${Math.random().toString(36).slice(2, 10)}`
}

export const useDocsStore = create<DocsState>()(
  persist(
    (set, get) => ({
      documents: seedDocuments,
      usage: { ...defaultUsage },
      pendingConfig: null,
      pendingAudio: null,
      toast: null,
      setPendingConfig: (pendingConfig) => set({ pendingConfig }),
      setPendingAudio: (pendingAudio) => set({ pendingAudio }),
      showToast: (toast) => {
        set({ toast })
        window.setTimeout(() => {
          if (get().toast === toast) set({ toast: null })
        }, 2800)
      },
      clearToast: () => set({ toast: null }),
      setDocuments: (documents) =>
        set((s) => ({
          documents,
          usage: { ...s.usage, docsCreated: documents.length },
        })),
      upsertDocument: (doc) => {
        set((s) => {
          const exists = s.documents.some((d) => d.id === doc.id)
          return {
            documents: exists
              ? s.documents.map((d) => (d.id === doc.id ? doc : d))
              : [doc, ...s.documents],
            usage: {
              ...s.usage,
              docsCreated: exists ? s.usage.docsCreated : s.usage.docsCreated + 1,
            },
          }
        })
        return doc
      },
      setTrials: (trialsUsed, trialsLimit = FREE_DOCUMENT_LIMIT) =>
        set((s) => ({ usage: { ...s.usage, trialsUsed, trialsLimit } })),
      addDocument: (doc) => {
        const now = new Date().toISOString()
        const item: DocItem = {
          ...doc,
          id: doc.id ?? uid(),
          favorite: doc.favorite ?? false,
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({
          documents: [item, ...s.documents.filter((d) => d.id !== item.id)],
          usage: {
            ...s.usage,
            docsCreated: s.usage.docsCreated + 1,
            storageUsedMb: Math.min(s.usage.storageLimitMb, s.usage.storageUsedMb + 2),
          },
        }))
        return item
      },
      updateDocument: (id, patch) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
          ),
        })),
      deleteDocument: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      duplicateDocument: (id) => {
        const source = get().documents.find((d) => d.id === id)
        if (!source) return
        get().addDocument({
          title: `${source.title} (Copy)`,
          type: source.type,
          content: source.content,
          language: source.language,
          tone: source.tone,
          favorite: false,
        })
      },
      toggleFavorite: (id) =>
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, favorite: !d.favorite } : d)),
        })),
      createFromConfig: (config) => {
        const generated = generateMockDocument(config.type, config.tone, config.length, config.sourceLabel)
        return get().addDocument({
          title: generated.title,
          type: config.type,
          content: generated.content,
          language: config.language,
          tone: config.tone,
        })
      },
      createBlank: () =>
        get().addDocument({
          title: 'Untitled Document',
          type: 'Meeting Notes',
          content: '<p>Start writing…</p>',
          language: 'English' as Language,
          tone: 'Professional' as Tone,
        }),
      createFromTemplate: (type, name) => {
        const generated = generateMockDocument(type, 'Professional', 'Medium', name)
        return get().addDocument({
          title: generated.title,
          type,
          content: generated.content,
          language: 'English',
          tone: 'Professional',
        })
      },
      bumpUsage: (minutes = 3) =>
        set((s) => ({
          usage: {
            ...s.usage,
            minutesUsed: Math.min(s.usage.minutesLimit + 1000, s.usage.minutesUsed + minutes),
          },
        })),
      consumeTrial: () =>
        set((s) => ({
          usage: {
            ...s.usage,
            trialsUsed: s.usage.trialsUsed + 1,
            trialsLimit: FREE_DOCUMENT_LIMIT,
          },
        })),
    }),
    {
      name: 'v2d-docs',
      partialize: (state) => ({
        documents: state.documents,
        usage: state.usage,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<DocsState> | undefined
        return {
          ...current,
          ...p,
          pendingConfig: null,
          pendingAudio: null,
          usage: {
            ...defaultUsage,
            ...current.usage,
            ...p?.usage,
            trialsUsed: p?.usage?.trialsUsed ?? current.usage.trialsUsed ?? 0,
            trialsLimit: FREE_DOCUMENT_LIMIT,
          },
        }
      },
    },
  ),
)
