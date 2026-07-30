import { Mic } from 'lucide-react'
import { Link } from 'react-router-dom'

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const icon = size === 'lg' ? 22 : size === 'sm' ? 14 : 16
  return (
    <span className={`inline-flex ${box} items-center justify-center rounded-xl bg-ink text-accent-soft dark:bg-dark-ink dark:text-accent`}>
      <Mic size={icon} strokeWidth={2.2} />
    </span>
  )
}

export function BrandWordmark({ to = '/', size = 'md' }: { to?: string; size?: 'sm' | 'md' | 'lg' }) {
  const text = size === 'lg' ? 'text-3xl md:text-5xl' : size === 'sm' ? 'text-lg' : 'text-xl'
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 no-underline">
      <BrandMark size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'} />
      <span className={`font-display font-semibold tracking-tight text-ink dark:text-dark-ink ${text}`}>
        Voice2Doc
      </span>
    </Link>
  )
}
