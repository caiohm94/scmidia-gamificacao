'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Trophy, Users, Target, History, Upload, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/campaigns', label: 'Campanhas', icon: Trophy },
  { href: '/manager/users', label: 'Usuários', icon: Users },
  { href: '/manager/points', label: 'Lançar Pontos', icon: Target },
  { href: '/manager/points/import', label: 'Importar CSV', icon: Upload },
  { href: '/manager/points/history', label: 'Auditoria', icon: History },
  { href: '/manager/rankings', label: 'Rankings', icon: BarChart3 },
]

interface Props { collapsed?: boolean }

export function ManagerNav({ collapsed = false }: Props) {
  const pathname = usePathname()
  return (
    <nav style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {navItems.map(item => {
        const active = pathname === item.href || (item.href !== '/manager/dashboard' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '0.65rem',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '0.65rem 0' : '0.55rem 0.75rem',
              borderRadius: '0 0.5rem 0.5rem 0.5rem',
              backgroundColor: active ? 'rgba(141,178,60,0.2)' : 'transparent',
              color: active ? '#8DB23C' : 'rgba(255,255,255,0.7)',
              textDecoration: 'none', fontSize: '0.82rem',
              fontFamily: 'var(--font-outfit, sans-serif)',
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}
            onMouseEnter={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(141,178,60,0.1)'
                ;(e.currentTarget as HTMLElement).style.color = '#8DB23C'
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'
              }
            }}
          >
            <item.icon size={16} style={{ flexShrink: 0 }} />
            {!collapsed && item.label}
          </Link>
        )
      })}
    </nav>
  )
}
