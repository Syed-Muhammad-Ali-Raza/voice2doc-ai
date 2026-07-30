import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  strong?: boolean
}

export function GlassCard({ children, className = '', strong = false, ...rest }: Props) {
  return (
    <div className={`${strong ? 'glass-strong' : 'glass'} ${className}`} {...rest}>
      {children}
    </div>
  )
}
