import Link from 'next/link'
import { requireAuth } from '@/lib/auth/helpers'

const navItems = [
  { href: '/manager/campaigns', label: 'Campanhas' },
  { href: '/manager/users', label: 'Usuários' },
  { href: '/manager/points', label: 'Lançar Pontos' },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r flex flex-col bg-background">
        <div className="p-6 border-b">
          <p className="font-bold text-lg text-yellow-500">SCMídia</p>
          <p className="text-xs text-muted-foreground">Gamificação Comercial</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
