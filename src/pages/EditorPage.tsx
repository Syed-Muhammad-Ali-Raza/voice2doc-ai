import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Bold,
  Copy,
  Italic,
  List,
  ListOrdered,
  Printer,
  Redo2,
  Undo2,
  Download,
  Sparkles,
} from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { CollabPanel } from '../components/CollabPanel'
import { EchoScorePanel } from '../components/EchoScorePanel'
import { env } from '../config/env'
import { ApiError } from '../lib/apiClient'
import { aiService } from '../services/aiService'
import { documentService } from '../services/documentService'
import { integrationService } from '../services/integrationService'
import { voiceTwinService } from '../services/voiceTwinService'
import { useDocsStore } from '../store/docs'
import { useSettingsStore } from '../store/auth'

export function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const documents = useDocsStore((s) => s.documents)
  const updateDocument = useDocsStore((s) => s.updateDocument)
  const showToast = useDocsStore((s) => s.showToast)
  const autoSave = useSettingsStore((s) => s.autoSave)
  const doc = documents.find((d) => d.id === id)
  const [title, setTitle] = useState(doc?.title ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [baseUpdatedAt, setBaseUpdatedAt] = useState(doc?.updatedAt ?? '')
  const [twinId, setTwinId] = useState<string | null>(null)
  const saveTimer = useRef<number | null>(null)

  const persistRemote = (patch: { content?: string; title?: string }) => {
    if (env.useMockApi || !doc) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void documentService
        .update(doc.id, { ...patch, baseUpdatedAt } as Partial<typeof doc> & { baseUpdatedAt?: string })
        .then((updated) => {
          setBaseUpdatedAt(updated.updatedAt)
          setSavedAt(new Date().toLocaleTimeString())
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 409) {
            showToast('Conflict — document changed elsewhere. Reloading…')
            void documentService.get(doc.id).then((fresh) => {
              if (!fresh) return
              updateDocument(doc.id, fresh)
              setBaseUpdatedAt(fresh.updatedAt)
              setTitle(fresh.title)
              if (editor && fresh.content !== editor.getHTML()) {
                editor.commands.setContent(fresh.content)
              }
            })
            return
          }
          showToast('Cloud save failed')
        })
    }, 600)
  }

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: 'Your document appears here…' }),
      ],
      content: doc?.content ?? '',
      editorProps: {
        attributes: {
          class: 'prose-editor min-h-[320px] text-ink dark:text-dark-ink',
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (!doc || !autoSave) return
        const content = ed.getHTML()
        updateDocument(doc.id, { content, title })
        persistRemote({ content, title })
        setSavedAt(new Date().toLocaleTimeString())
      },
    },
    [doc?.id],
  )

  useEffect(() => {
    if (doc) {
      setTitle(doc.title)
      setBaseUpdatedAt(doc.updatedAt)
    }
  }, [doc])

  useEffect(() => {
    let cancelled = false
    void voiceTwinService.list().then((data) => {
      if (!cancelled) setTwinId(data.twins[0]?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const reloadFromServer = () => {
    if (!doc || env.useMockApi) return
    void documentService.get(doc.id).then((fresh) => {
      if (!fresh) return
      updateDocument(doc.id, fresh)
      setBaseUpdatedAt(fresh.updatedAt)
      setTitle(fresh.title)
      if (editor && fresh.content !== editor.getHTML()) {
        editor.commands.setContent(fresh.content)
      }
    })
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-muted">Document not found.</p>
        <Link to="/app/documents" className="btn-primary mt-4 inline-flex">
          Back to documents
        </Link>
      </div>
    )
  }

  const runAi = async (action: 'rewrite' | 'expand' | 'shorten' | 'grammar' | 'translate') => {
    if (!editor) return
    setBusy(action)
    try {
      const next = await aiService.transform(editor.getHTML(), action, doc.language)
      editor.commands.setContent(next)
      updateDocument(doc.id, { content: next })
      persistRemote({ content: next })
      showToast(`AI ${action} applied`)
    } catch {
      showToast('AI assist failed')
    } finally {
      setBusy(null)
    }
  }

  const soundLikeMe = async () => {
    if (!editor) return
    if (!twinId) {
      showToast('Train a Voice Twin first in Voice Twin')
      return
    }
    setBusy('voice-twin')
    try {
      const result = await voiceTwinService.apply(twinId, editor.getHTML())
      editor.commands.setContent(result.html)
      updateDocument(doc.id, { content: result.html })
      persistRemote({ content: result.html })
      showToast(`Voice Twin applied · match ${result.matchScore}`)
    } catch {
      showToast('Voice Twin apply failed')
    } finally {
      setBusy(null)
    }
  }

  const exportFile = (format: 'txt' | 'md' | 'pdf' | 'docx') => {
    if (format === 'pdf' || format === 'docx') {
      showToast(`Preparing ${format.toUpperCase()} export… (demo stub)`)
      return
    }
    const text = editor?.getText() ?? ''
    const html = editor?.getHTML() ?? ''
    const body = format === 'md' ? htmlToApproxMarkdown(html) : text
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'document'}.${format === 'md' ? 'md' : 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported as ${format.toUpperCase()}`)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="font-display min-w-0 flex-1 bg-transparent text-2xl font-semibold text-ink outline-none dark:text-dark-ink"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            updateDocument(doc.id, { title: e.target.value })
            persistRemote({ title: e.target.value })
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(editor?.getText() ?? '')
              showToast('Copied to clipboard')
            }}
          >
            <Copy size={16} /> Copy
          </button>
          <button type="button" className="btn-ghost" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <div className="relative">
            <details className="group">
              <summary className="btn-secondary list-none [&::-webkit-details-marker]:hidden">
                <Download size={16} /> Export
              </summary>
              <div className="glass absolute right-0 z-20 mt-2 w-48 overflow-hidden p-1">
                {(['txt', 'md', 'pdf', 'docx'] as const).map((f) => (
                  <button key={f} type="button" className="btn-ghost w-full justify-start" onClick={() => exportFile(f)}>
                    .{f}
                  </button>
                ))}
                <div className="my-1 border-t border-border dark:border-dark-border" />
                <button
                  type="button"
                  className="btn-ghost w-full justify-start"
                  onClick={async () => {
                    try {
                      const result = await integrationService.exportDoc('notion', doc.id)
                      showToast(result.message || 'Sent to Notion')
                      if (result.externalUrl) window.open(result.externalUrl, '_blank', 'noopener')
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : 'Notion export failed — connect in Integrations')
                    }
                  }}
                >
                  Send to Notion
                </button>
                <button
                  type="button"
                  className="btn-ghost w-full justify-start"
                  onClick={async () => {
                    try {
                      const result = await integrationService.exportDoc('google_docs', doc.id)
                      showToast(result.message || 'Sent to Google Docs')
                      if (result.externalUrl) window.open(result.externalUrl, '_blank', 'noopener')
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : 'Google Docs export failed — connect in Integrations')
                    }
                  }}
                >
                  Send to Google Docs
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted">
        {doc.type} · {doc.tone} · {doc.language}
        {savedAt ? ` · Saved ${savedAt}` : autoSave ? ' · Auto-save on' : ''}
      </p>

      <GlassCard className="overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-border p-2 dark:border-dark-border">
          <button type="button" className="btn-ghost" onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 size={16} />
          </button>
          <button type="button" className="btn-ghost" onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 size={16} />
          </button>
          <button type="button" className="btn-ghost" onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold size={16} />
          </button>
          <button type="button" className="btn-ghost" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic size={16} />
          </button>
          <button type="button" className="btn-ghost" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List size={16} />
          </button>
          <button type="button" className="btn-ghost" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={16} />
          </button>
        </div>
        <div className="p-5 md:p-8">
          <EditorContent editor={editor} />
        </div>
      </GlassCard>

      <EchoScorePanel
        documentId={doc.id}
        draftHtml={editor?.getHTML() ?? doc.content}
        onRestore={(phrase) => {
          if (!editor) return
          const safe = phrase
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
          editor.chain().focus().insertContent(`<ul><li>${safe}</li></ul>`).run()
          const content = editor.getHTML()
          updateDocument(doc.id, { content })
          persistRemote({ content })
        }}
      />

      <CollabPanel documentId={doc.id} onMirroredChange={reloadFromServer} />

      <GlassCard className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink dark:text-dark-ink">
          <Sparkles size={16} className="text-accent" /> AI assist
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['rewrite', 'Rewrite'],
              ['expand', 'Expand'],
              ['shorten', 'Shorten'],
              ['grammar', 'Improve Grammar'],
              ['translate', 'Translate'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="btn-secondary"
              disabled={busy !== null}
              onClick={() => runAi(key)}
            >
              {busy === key ? 'Working…' : label}
            </button>
          ))}
          <button
            type="button"
            className="btn-primary"
            disabled={busy !== null}
            onClick={() => void soundLikeMe()}
          >
            {busy === 'voice-twin' ? 'Working…' : 'Sound like me'}
          </button>
        </div>
      </GlassCard>

      <button type="button" className="btn-ghost" onClick={() => navigate('/app/documents')}>
        ← Documents
      </button>
    </div>
  )
}

function htmlToApproxMarkdown(html: string) {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}
