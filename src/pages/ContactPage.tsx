import { useState } from 'react'
import { GlassCard } from '../components/GlassCard'
import { useDocsStore } from '../store/docs'

export function ContactPage() {
  const showToast = useDocsStore((s) => s.showToast)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  return (
    <div className="page-enter mx-auto max-w-xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink dark:text-dark-ink">Contact</h1>
      <p className="mt-3 text-muted">Questions about Voice2Doc? Send a note—demo replies instantly.</p>
      <GlassCard className="mt-8 space-y-4 p-6">
        <input
          className="input-field"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <textarea
          className="input-field min-h-32"
          placeholder="Message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => {
            showToast('Message sent (demo). We will be in touch.')
            setForm({ name: '', email: '', message: '' })
          }}
        >
          Send message
        </button>
      </GlassCard>
    </div>
  )
}
