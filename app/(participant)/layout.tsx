import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Avatar } from '@/components/shared/Avatar'
import Link from 'next/link'

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  await requireRole('participant')
  const user = await getSessionUser()
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <Link href="/participant/dashboard" className="text-yellow-400 font-bold text-lg">
          🏆 Missão Hexa
        </Link>
        <nav className="flex items-center gap-6 text-sm text-gray-300">
          <Link href="/participant/dashboard" className="hover:text-white">Painel</Link>
          <Link href="/participant/ranking" className="hover:text-white">Ranking</Link>
          <Link href="/participant/history" className="hover:text-white">Histórico</Link>
          <Link href="/participant/feed" className="hover:text-white">Feed</Link>
        </nav>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Avatar src={user?.avatar_url} name={user?.name ?? ''} size={32} />
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  )
}
