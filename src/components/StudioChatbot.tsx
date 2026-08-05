import { useEffect, useMemo, useState } from 'react'
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useT } from '../i18n/useT'
import { chatService, type ChatMessage, type ChatMode, type ChatSession } from '../services/chatService'
import { useDocsStore } from '../store/docs'
import { useSettingsStore } from '../store/auth'

export function StudioChatbot() {
  const t = useT()
  const location = useLocation()
  const docs = useDocsStore((s) => s.documents)
  const showToast = useDocsStore((s) => s.showToast)
  const [open, setOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [mode, setMode] = useState<ChatMode>('help')
  const [booted, setBooted] = useState(false)
  const privacyAnalytics = useSettingsStore((s) => s.privacyAnalytics)

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  )

  const activeDocId = useMemo(() => {
    const m = location.pathname.match(/^\/app\/editor\/([^/]+)$/)
    return m?.[1] ?? null
  }, [location.pathname])

  useEffect(() => {
    if (!open || booted) return
    setBooted(true)
    void (async () => {
      try {
        const listed = await chatService.listSessions()
        setSessions(listed.sessions)
        if (listed.sessions[0]) {
          setActiveSessionId(listed.sessions[0].id)
          const msgs = await chatService.listMessages(listed.sessions[0].id)
          setMessages(msgs.messages)
          setMode(listed.sessions[0].mode)
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : t('chat.loadFailed'))
      }
    })()
  }, [open, booted, showToast, t])

  const ensureSession = async (): Promise<ChatSession | null> => {
    if (activeSession) return activeSession
    try {
      const created = await chatService.createSession({
        mode,
        title: mode === 'help' ? t('chat.modeHelp') : mode === 'document' ? t('chat.modeDocument') : t('chat.modeMeeting'),
        documentId: mode === 'document' ? activeDocId ?? undefined : undefined,
      })
      setSessions((prev) => [created, ...prev])
      setActiveSessionId(created.id)
      setMessages([])
      return created
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.createFailed'))
      return null
    }
  }

  const send = async () => {
    if (!input.trim() || sending) return
    const session = await ensureSession()
    if (!session) return
    const content = input.trim()
    setInput('')
    setSending(true)
    const optimistic: ChatMessage = {
      id: `tmp-u-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    try {
      const result = await chatService.sendMessage(session.id, content)
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        result.userMessage,
        result.assistantMessage,
      ])
      if (!result.persisted || !privacyAnalytics) {
        showToast(t('chat.ephemeral'))
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      showToast(err instanceof Error ? err.message : t('chat.sendFailed'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed right-4 bottom-24 z-50 flex flex-col items-end gap-3 md:right-6 md:bottom-28">
      {open && (
        <div className="glass-strong w-[min(100vw-2rem,24rem)] p-4 shadow-lg">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg font-semibold text-ink dark:text-dark-ink">{t('chat.title')}</p>
              <p className="mt-1 text-xs text-muted">{t('chat.subtitle')}</p>
            </div>
            <button type="button" className="btn-ghost p-1" onClick={() => setOpen(false)} aria-label={t('common.closeMenu')}>
              <X size={16} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2">
            {([
              ['help', t('chat.modeHelp')],
              ['document', t('chat.modeDocument')],
              ['meeting', t('chat.modeMeeting')],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={async () => {
                  setMode(id)
                  try {
                    const created = await chatService.createSession({
                      mode: id,
                      title: label,
                      documentId: id === 'document' ? activeDocId ?? undefined : undefined,
                    })
                    setSessions((prev) => [created, ...prev])
                    setActiveSessionId(created.id)
                    setMessages([])
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : t('chat.createFailed'))
                  }
                }}
                className={`rounded-xl px-2 py-1.5 text-xs font-semibold transition ${
                  mode === id ? 'bg-accent text-white' : 'bg-black/5 text-muted dark:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-white/30 p-3 dark:border-dark-border dark:bg-white/5">
            {messages.length === 0 ? (
              <p className="text-sm text-muted">{t('chat.empty')}</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'ml-6 bg-accent/15 text-ink dark:text-dark-ink'
                      : 'mr-6 bg-black/5 text-ink dark:bg-white/10 dark:text-dark-ink'
                  }`}
                >
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {m.role === 'user' ? t('chat.you') : t('chat.assistant')}
                  </p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              className="input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void send()
                }
              }}
              placeholder={
                mode === 'document' && activeDocId
                  ? `${t('chat.askAbout')} ${docs.find((d) => d.id === activeDocId)?.title || t('chat.document')}`
                  : t('chat.placeholder')
              }
            />
            <button type="button" className="btn-primary px-3" onClick={() => void send()} disabled={sending}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:brightness-110 ${
          open ? 'ring-4 ring-accent/30' : ''
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t('chat.title')}
      >
        {open ? <MessageCircle size={22} /> : <Bot size={22} />}
      </button>
      {!open && (
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles size={12} className="mr-1 inline" />
          {t('chat.title')}
        </span>
      )}
    </div>
  )
}

