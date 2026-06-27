import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import type { UserProfile } from '@/types/database'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function UsersPage() {
  await requireRole('manager')
  const supabase = await createClient()
  const result = await supabase.from('users').select('*, teams(name, color)').order('name')
  const users = result.data as UserProfile[] | null

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Link href="/manager/users/new">
          <Button>Novo usuário</Button>
        </Link>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Usuário', 'Time', 'Função', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 flex items-center gap-3">
                  <Avatar src={u.avatar_url} name={u.name} size={32} />
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.teams && (
                    <Badge style={{ backgroundColor: u.teams.color + '20', color: u.teams.color }}>
                      {u.teams.name}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.function}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                    {u.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/manager/users/${u.id}`}>
                    <Button variant="ghost" size="sm">Editar</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
