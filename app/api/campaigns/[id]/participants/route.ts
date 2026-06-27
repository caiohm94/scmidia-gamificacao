import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('campaign_participants')
    .select('*, users(id, name, email, avatar_url, function, teams(name, color))')
    .eq('campaign_id', id)
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user_ids } = await request.json() as { user_ids: string[] }
  const admin = createAdminClient()
  const rows = user_ids.map(user_id => ({ campaign_id: id, user_id }))
  const { data, error } = await admin.from('campaign_participants').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user_id } = await request.json() as { user_id: string }
  const admin = createAdminClient()
  const { error } = await admin.from('campaign_participants')
    .delete().eq('campaign_id', id).eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
