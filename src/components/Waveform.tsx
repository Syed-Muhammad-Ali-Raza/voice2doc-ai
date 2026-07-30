export function Waveform({ active, bars = 28 }: { active: boolean; bars?: number }) {
  return (
    <div className="flex h-16 items-end justify-center gap-1" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`wave-bar w-1 rounded-full bg-accent ${active ? 'opacity-100' : 'opacity-30'}`}
          style={{
            height: `${18 + ((i * 17) % 38)}px`,
            animationPlayState: active ? 'running' : 'paused',
            animationDelay: `${(i % 8) * 0.08}s`,
          }}
        />
      ))}
    </div>
  )
}
