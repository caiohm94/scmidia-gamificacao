import Link from 'next/link'
import { requireRole } from '@/lib/auth/helpers'
import { LayoutDashboard, Trophy, Users, Target, History, Upload } from 'lucide-react'

const navItems = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/campaigns', label: 'Campanhas', icon: Trophy },
  { href: '/manager/users', label: 'Usuários', icon: Users },
  { href: '/manager/points', label: 'Lançar Pontos', icon: Target },
  { href: '/manager/points/import', label: 'Importar CSV', icon: Upload },
  { href: '/manager/points/history', label: 'Auditoria', icon: History },
  { href: '/manager/rankings', label: 'Rankings', icon: Trophy },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requireRole('manager')
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-950 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <p className="font-bold text-lg text-yellow-400">SCMídia</p>
          <p className="text-xs text-gray-400">Painel do Gestor</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
