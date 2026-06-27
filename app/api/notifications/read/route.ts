import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await request.json() as { ids?: string[] }
  const admin = createAdminClient()

  let query = admin.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id)
  if (ids?.length) query = query.in('id', ids)
  else query = query.is('read_at', null)

  await query
  return NextResponse.json({ ok: true })
}
