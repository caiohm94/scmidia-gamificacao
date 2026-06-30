import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import type { UserProfile } from '@/types/database'
import { UsersTable } from '@/components/manager/UsersTable'
import Link from 'next/link'
import { Users, Plus } from 'lucide-react'

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
          <UsersTable users={users ?? []} />
        </div>
      </div>
    </div>
  )
}
