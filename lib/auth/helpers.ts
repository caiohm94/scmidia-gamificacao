import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Tables } from '@/types/database'

export type SessionUser = Tables<'users'> & { teams: { name: string; color: string } | null }

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(role: 'manager' | 'participant') {
  const user = await requireAuth()
  const supabase = await createClient()
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!data || data.role !== role) redirect('/login')
  return user
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users').select('*, teams(name, color)').eq('id', user.id).single()
  return data as SessionUser | null
}
