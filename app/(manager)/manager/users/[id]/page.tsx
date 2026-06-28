import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { UserForm } from '@/components/users/UserForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { UserCircle } from 'lucide-react'

type Props = { params: Promise<{ id: string }> }

export default async function EditUserPage({ params }: Props) {
  await requireRole('manager')
  const { id } = await params
  const supabase = await createClient()

  type UserWithTeam = {
    id: string; name: string; email: string; role: 'manager' | 'participant'
    function: 'internal_seller' | 'external_seller' | 'hunter' | 'manager' | 'auditor'
    status: 'active' | 'inactive'; team_id: string | null
    teams: { id: string; name: string; color: string } | null
  }
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, role, function, status, team_id, teams(id, name, color)')
    .eq('id', id)
    .single() as { data: UserWithTeam | null; error: unknown }

  if (!user) notFound()

  const { data: teams } = await supabase.from('teams').select('id, name, color').order('name')

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCircle size={18} color="#8DB23C" />
          </div>
          <div>
            <h1 className="sc-page-title">Editar Usuário</h1>
            <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.45)', fontFamily: 'var(--font-outfit, sans-serif)', marginTop: '0.1rem' }}>{user.email}</p>
          </div>
        </div>
        <Link href="/manager/users">
          <button className="sc-btn-outline text-sm cursor-pointer">← Voltar</button>
        </Link>
      </div>

      <div className="p-6">
        <div className="sc-card max-w-xl">
          <UserForm
            userId={id}
            teams={teams ?? []}
            defaultValues={{
              name: user.name,
              email: user.email,
              role: user.role,
              function: user.function,
              status: user.status,
              team_id: user.team_id ?? null,
            }}
          />
        </div>
      </div>
    </div>
  )
}
