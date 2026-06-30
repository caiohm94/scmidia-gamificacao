'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/participant/dashboard', label: 'Painel' },
  { href: '/participant/metas', label: 'Metas' },
  { href: '/participant/ranking', label: 'Classificação' },
  { href: '/participant/history', label: 'Histórico' },
  { href: '/participant/feed', label: 'Feed' },
]

export function ParticipantNav() {
  const pathname = usePathname()
  return (
    <nav style={{ display: 'flex', gap: '0.25rem' }}>
      {items.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} style={{
            padding: '0.3rem 0.85rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.82rem',
            fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: active ? 600 : 400,
            color: active ? '#FFDF00' : 'rgba(255,255,255,0.55)',
            background: active ? 'rgba(255,223,0,0.1)' : 'transparent',
            textDecoration: 'none', transition: 'color 0.15s, background 0.15s',
          }}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
