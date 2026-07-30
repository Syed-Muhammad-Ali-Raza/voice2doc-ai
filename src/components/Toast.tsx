import { useEffect, useState } from 'react'
import { useDocsStore } from '../store/docs'

export function Toast() {
  const toast = useDocsStore((s) => s.toast)
  const clearToast = useDocsStore((s) => s.clearToast)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(Boolean(toast))
  }, [toast])

  if (!toast) return null

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 transition ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="status"
    >
      <button
        type="button"
        onClick={clearToast}
        className="glass-strong rounded-2xl px-4 py-2.5 text-sm font-medium text-ink shadow-lg dark:text-dark-ink"
      >
        {toast}
      </button>
    </div>
  )
}
