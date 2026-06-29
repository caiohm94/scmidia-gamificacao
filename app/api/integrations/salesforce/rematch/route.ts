import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { record_id } = await request.json() as { record_id: string }
  if (!record_id) return NextResponse.json({ error: 'record_id required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: record, error: recErr } = await admin
    .from('salesforce_records')
    .select('id, sf_id, sf_alias, account_name, description, sf_created_at, scoring_rule_id, campaign_id, transaction_id, user_id')
    .eq('id', record_id)
    .single()

  if (recErr || !record) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
  if (record.transaction_id) return NextResponse.json({ error: 'Já possui match' }, { status: 400 })
  if (!record.sf_alias) return NextResponse.json({ matched: false, reason: 'Sem alias SF no registro' })

  const { data: rule } = await admin
    .from('scoring_rules')
    .select('id, name, points, campaign_id')
    .eq('id', record.scoring_rule_id)
    .single()

  if (!rule) return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 })

  const { data: participants } = await admin
    .from('campaign_participants')
    .select('user_id')
    .eq('campaign_id', rule.campaign_id)

  const userIds = (participants ?? []).map(p => p.user_id)

  const { data: usersData } = await admin
    .from('users')
    .select('id, sf_alias')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

  const matchedUser = usersData?.find(u => u.sf_alias === record.sf_alias)
  if (!matchedUser) {
    return NextResponse.json({ matched: false, reason: `Alias "${record.sf_alias}" não encontrado nos participantes` })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: txRows, error: txErr } = await admin
    .from('point_transactions')
    .insert({
      campaign_id: rule.campaign_id,
      user_id: matchedUser.id,
      scoring_rule_id: rule.id,
      points: rule.points,
      event_date: today,
      description: `SF Import — ${rule.name}${record.account_name ? ` (${record.account_name})` : ''}`,
      origin: 'salesforce',
      created_by: user.id,
    })
    .select('id')

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  const transactionId = txRows?.[0]?.id ?? null

  await admin
    .from('salesforce_records')
    .update({ user_id: matchedUser.id, transaction_id: transactionId })
    .eq('id', record_id)

  return NextResponse.json({ matched: true, points: rule.points })
}
