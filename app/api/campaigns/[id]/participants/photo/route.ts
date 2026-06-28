import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const userId = formData.get('user_id') as string | null

  if (!file || !userId) return NextResponse.json({ error: 'file e user_id obrigatórios' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${campaignId}/${userId}.${ext}`
  const bytes = await file.arrayBuffer()

  const admin = createAdminClient()
  const { error: uploadErr } = await admin.storage
    .from('participant-photos')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('participant-photos').getPublicUrl(path)

  const { error: updateErr } = await admin
    .from('campaign_participants')
    .update({ photo_url: publicUrl })
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ photo_url: publicUrl })
}
