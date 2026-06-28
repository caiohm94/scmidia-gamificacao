import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import type { UserProfile } from '@/types/database'
import { Avatar } from '@/components/shared/Avatar'
import Link from 'next/link'
import { Users, Plus } from 'lucide-react'

const roleLabel: Record<string, string> = { manager: 'Gestor', participant: 'Participante', viewer: 'Visualizador' }

export default async function UsersPage() {
  await requireRole('manager')
  const supabase = await createClient()
  const result = await supabase.from('users').select('*, teams(name, color)').order('name')
  const users = result.data as UserProfile[] | null

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Usuários</h1>
        </div>
        <Link href="/manager/users/new">
          <button className="sc-btn-primary flex items-center gap-2 text-sm cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} />
            Novo usuário
          </button>
        </Link>
      </div>

      <div className="p-6">
        <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(63,62,62,0.04)', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
                {['Usuário', 'Time', 'Função', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 500, fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)', letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u, i) => (
                <tr key={u.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(63,62,62,0.07)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar_url} name={u.name} size={32} />
                      <div>
                        <p style={{ fontWeight: 500, color: '#3F3E3E' }}>{u.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.teams && (
                      <span style={{ display: 'inline-flex', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 500, borderRadius: '0 0.35rem 0.35rem 0.35rem', background: (u.teams.color ?? '#8DB23C') + '22', color: u.teams.color ?? '#8DB23C' }}>
                        {u.teams.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'rgba(63,62,62,0.6)', fontSize: '0.85rem' }}>{u.function}</td>
                  <td className="px-4 py-3">
                    <span style={{
                      display: 'inline-flex', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 500,
                      borderRadius: '0 0.35rem 0.35rem 0.35rem',
                      background: u.status === 'active' ? 'rgba(141,178,60,0.12)' : 'rgba(63,62,62,0.06)',
                      color: u.status === 'active' ? '#5C7435' : 'rgba(63,62,62,0.45)',
                    }}>
                      {u.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/manager/users/${u.id}`}>
                      <button className="sc-btn-outline text-xs cursor-pointer" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Editar</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
