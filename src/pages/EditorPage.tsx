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
import { env } from '../config/env'
import { aiService } from '../services/aiService'
import { documentService } from '../services/documentService'
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
  const saveTimer = useRef<number | null>(null)

  const persistRemote = (patch: { content?: string; title?: string }) => {
    if (env.useMockApi || !doc) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void documentService.update(doc.id, patch).catch(() => {
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
    if (doc) setTitle(doc.title)
  }, [doc])

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
      showToast(`AI ${action} applied`)
    } catch {
      showToast('AI assist failed')
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
              <div className="glass absolute right-0 z-20 mt-2 w-40 overflow-hidden p-1">
                {(['txt', 'md', 'pdf', 'docx'] as const).map((f) => (
                  <button key={f} type="button" className="btn-ghost w-full justify-start" onClick={() => exportFile(f)}>
                    .{f}
                  </button>
                ))}
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
