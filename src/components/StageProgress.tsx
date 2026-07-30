const stages = ['Uploading', 'Transcribing', 'Understanding', 'Formatting', 'Finalizing'] as const

export function StageProgress({ current }: { current: number }) {
  return (
    <ol className="space-y-3">
      {stages.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={label}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${
              active ? 'bg-accent/10 text-ink dark:text-dark-ink' : done ? 'text-signal' : 'text-muted'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? 'bg-signal text-white'
                  : active
                    ? 'bg-accent text-white'
                    : 'bg-black/5 dark:bg-white/10'
              }`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span className="text-sm font-medium">{label}</span>
            {active && <span className="ml-auto text-xs text-accent">In progress…</span>}
          </li>
        )
      })}
    </ol>
  )
}

export { stages }
