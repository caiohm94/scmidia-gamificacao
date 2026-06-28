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

export function ManagerNav() {
  const pathname = usePathname()
  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {navItems.map(item => {
        const active = pathname === item.href || (item.href !== '/manager/dashboard' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: active ? 'rgba(141,178,60,0.2)' : 'transparent',
              color: active ? '#8DB23C' : 'rgba(255,255,255,0.75)',
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
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'
              }
            }}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
