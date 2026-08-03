import { useEffect, useState } from 'react'
import { Headphones, MessageSquarePlus, Trash2, Users } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { useT } from '../i18n/useT'
import {
  collabService,
  type CollabComment,
  type PresenceMode,
  type PresencePeer,
} from '../services/collabService'
import { useDocsStore } from '../store/docs'

export function CollabPanel({
  documentId,
  onMirroredChange,
}: {
  documentId: string
  onMirroredChange?: () => void
}) {
  const t = useT()
  const showToast = useDocsStore((s) => s.showToast)
  const [comments, setComments] = useState<CollabComment[]>([])
  const [presence, setPresence] = useState<PresencePeer[]>([])
  const [body, setBody] = useState('')
  const [stamp, setStamp] = useState('0:45')
  const [mode, setMode] = useState<PresenceMode>('editing')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let closed = false
    const socket = collabService.connectSocket(documentId, {
      onPresence: (peers) => {
        if (!closed) setPresence(peers)
      },
      onCommentCreated: (comment) => {
        if (closed) return
        setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]))
        onMirroredChange?.()
      },
      onCommentDeleted: (commentId) => {
        if (closed) return
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        onMirroredChange?.()
      },
    })

    void (async () => {
      try {
        const data = await collabService.list(documentId)
        if (closed) return
        setComments(data.comments)
        setPresence(data.presence)
        await collabService.heartbeat(documentId, 'editing')
      } catch (err) {
        showToast(err instanceof Error ? err.message : t('collab.loadFailed'))
      }
    })()

    const beat = window.setInterval(() => {
      void collabService.heartbeat(documentId, mode).then((r) => {
        if (!closed && r.presence?.length) setPresence(r.presence)
      })
    }, 20000)

    return () => {
      closed = true
      window.clearInterval(beat)
      socket.close()
    }
  }, [documentId, mode, onMirroredChange, showToast, t])

  return (
    <GlassCard className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-dark-ink">
          <Users size={16} className="text-accent" />
          {t('collab.title')}
        </div>
        <div className="flex -space-x-2">
          {presence.map((p) => (
            <span
              key={p.userId}
              title={`${p.name} · ${p.mode}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-canvas text-xs font-bold text-white dark:border-dark-canvas"
              style={{ background: p.color }}
            >
              {p.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
          {presence.length === 0 && <span className="text-xs text-muted">{t('collab.alone')}</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['editing', t('collab.modeEditing')],
            ['listening', t('collab.modeListening')],
            ['recording', t('collab.modeRecording')],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              mode === id ? 'bg-accent text-white' : 'bg-black/5 text-muted dark:bg-white/5'
            }`}
            onClick={() => {
              setMode(id)
              void collabService.heartbeat(documentId, id)
            }}
          >
            {id === 'listening' ? <Headphones size={12} className="mr-1 inline" /> : null}
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t('collab.comments')}</p>
        {comments.length === 0 ? (
          <p className="text-sm text-muted">{t('collab.noComments')}</p>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-border/80 px-3 py-2 text-sm dark:border-dark-border"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-accent">
                      @{c.timestampLabel} · {c.authorName}
                    </p>
                    <p className="mt-1 text-ink dark:text-dark-ink">{c.body}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost p-1 text-danger"
                    aria-label={t('collab.delete')}
                    onClick={async () => {
                      try {
                        await collabService.remove(documentId, c.id)
                        setComments((prev) => prev.filter((x) => x.id !== c.id))
                        onMirroredChange?.()
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : t('collab.deleteFailed'))
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-[6rem_1fr_auto]">
        <input
          className="input-field"
          value={stamp}
          onChange={(e) => setStamp(e.target.value)}
          placeholder="0:00"
          aria-label={t('collab.timestamp')}
        />
        <input
          className="input-field"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('collab.placeholder')}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={busy || !body.trim()}
          onClick={async () => {
            const ms = collabService.parseTimestampInput(stamp)
            if (ms == null) {
              showToast(t('collab.badTimestamp'))
              return
            }
            setBusy(true)
            try {
              const comment = await collabService.create(documentId, {
                body: body.trim(),
                timestampMs: ms,
                mirror: true,
              })
              setComments((prev) => [...prev.filter((c) => c.id !== comment.id), comment])
              setBody('')
              onMirroredChange?.()
              showToast(t('collab.added'))
            } catch (err) {
              showToast(err instanceof Error ? err.message : t('collab.addFailed'))
            } finally {
              setBusy(false)
            }
          }}
        >
          <MessageSquarePlus size={16} />
          {t('collab.add')}
        </button>
      </div>
    </GlassCard>
  )
}
