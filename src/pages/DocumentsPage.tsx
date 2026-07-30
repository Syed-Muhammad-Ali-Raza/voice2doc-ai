import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Copy, Grid3X3, List, Share2, Star, Trash2 } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { env } from '../config/env'
import { DOCUMENT_TYPES } from '../lib/types'
import { documentService } from '../services/documentService'
import { useDocsStore } from '../store/docs'

export function DocumentsPage() {
  const documents = useDocsStore((s) => s.documents)
  const deleteDocument = useDocsStore((s) => s.deleteDocument)
  const duplicateDocument = useDocsStore((s) => s.duplicateDocument)
  const toggleFavorite = useDocsStore((s) => s.toggleFavorite)
  const showToast = useDocsStore((s) => s.showToast)

  const removeDoc = async (id: string) => {
    try {
      if (!env.useMockApi) await documentService.remove(id)
      deleteDocument(id)
    } catch {
      showToast('Failed to delete document')
    }
  }

  const toggleFav = async (id: string) => {
    const doc = documents.find((d) => d.id === id)
    if (!doc) return
    toggleFavorite(id)
    try {
      if (!env.useMockApi) await documentService.update(id, { favorite: !doc.favorite })
    } catch {
      toggleFavorite(id)
      showToast('Failed to update favorite')
    }
  }

  const [params] = useSearchParams()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [sort, setSort] = useState<'updated' | 'title' | 'type'>('updated')
  const [filterType, setFilterType] = useState<string>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const filtered = useMemo(() => {
    let list = [...documents]
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((d) => d.title.toLowerCase().includes(q) || d.type.toLowerCase().includes(q))
    }
    if (filterType !== 'all') list = list.filter((d) => d.type === filterType)
    if (favoritesOnly) list = list.filter((d) => d.favorite)
    list.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'type') return a.type.localeCompare(b.type)
      return +new Date(b.updatedAt) - +new Date(a.updatedAt)
    })
    return list
  }, [documents, query, sort, filterType, favoritesOnly])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Documents</h1>
          <p className="mt-1 text-muted">{filtered.length} items</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={`btn-ghost ${view === 'grid' ? 'bg-black/5 dark:bg-white/10' : ''}`} onClick={() => setView('grid')}>
            <Grid3X3 size={16} />
          </button>
          <button type="button" className={`btn-ghost ${view === 'list' ? 'bg-black/5 dark:bg-white/10' : ''}`} onClick={() => setView('list')}>
            <List size={16} />
          </button>
        </div>
      </div>

      <GlassCard className="grid gap-3 p-4 md:grid-cols-4">
        <input className="input-field md:col-span-2" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="input-field" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="updated">Sort: Updated</option>
          <option value="title">Sort: Title</option>
          <option value="type">Sort: Type</option>
        </select>
        <select className="input-field" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All types</option>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted md:col-span-4">
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} className="accent-accent" />
          Favorites only
        </label>
      </GlassCard>

      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <GlassCard key={doc.id} className="flex flex-col p-5">
              <Link to={`/app/editor/${doc.id}`} className="flex-1">
                <p className="font-semibold text-ink dark:text-dark-ink">{doc.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {doc.type} · {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </Link>
              <div className="mt-4 flex flex-wrap gap-1">
                <button type="button" className="btn-ghost" onClick={() => toggleFav(doc.id)} aria-label="Favorite">
                  <Star size={16} className={doc.favorite ? 'fill-accent text-accent' : ''} />
                </button>
                <button type="button" className="btn-ghost" onClick={() => duplicateDocument(doc.id)} aria-label="Duplicate">
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/app/editor/${doc.id}`)
                    showToast('Share link copied')
                  }}
                >
                  <Share2 size={16} />
                </button>
                <button type="button" className="btn-ghost text-danger" onClick={() => removeDoc(doc.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="divide-y divide-border dark:divide-dark-border">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Link to={`/app/editor/${doc.id}`} className="min-w-0 flex-1">
                <p className="font-medium text-ink dark:text-dark-ink">{doc.title}</p>
                <p className="text-xs text-muted">{doc.type}</p>
              </Link>
              <button type="button" className="btn-ghost" onClick={() => toggleFav(doc.id)}>
                <Star size={16} className={doc.favorite ? 'fill-accent text-accent' : ''} />
              </button>
              <button type="button" className="btn-ghost" onClick={() => duplicateDocument(doc.id)}>
                <Copy size={16} />
              </button>
              <button type="button" className="btn-ghost text-danger" onClick={() => removeDoc(doc.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </GlassCard>
      )}

      {filtered.length === 0 && <p className="text-center text-sm text-muted">No documents match your filters.</p>}
    </div>
  )
}
