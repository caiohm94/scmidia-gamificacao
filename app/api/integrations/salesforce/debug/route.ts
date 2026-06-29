import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getSalesforceConnection, executeSoql } from '@/lib/salesforce/client'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ruleId = request.nextUrl.searchParams.get('rule_id')
  if (!ruleId) return NextResponse.json({ error: 'rule_id required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: rule } = await admin
    .from('scoring_rules')
    .select('id, name, campaign_id, sf_soql, sf_alias_field')
    .eq('id', ruleId)
    .single()

  if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })

  const aliasField = rule.sf_alias_field ?? 'Owner.Alias'

  const { data: participants } = await admin
    .from('campaign_participants')
    .select('user_id')
    .eq('campaign_id', rule.campaign_id)

  const userIds = (participants ?? []).map((p: { user_id: string }) => p.user_id)

  const { data: usersData } = await admin
    .from('users')
    .select('id, name, sf_alias')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

  let sfRows: Record<string, unknown>[] = []
  let soqlError: string | null = null
  try {
    const conn = await getSalesforceConnection()
    sfRows = await executeSoql(conn, rule.sf_soql!)
  } catch (err) {
    soqlError = err instanceof Error ? err.message : String(err)
  }

  function getField(record: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.')
    const lastKey = parts[parts.length - 1]
    if (lastKey in record) return record[lastKey]
    if (path in record) return record[path]
    return parts.reduce<unknown>((acc, key) => {
      if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
      return undefined
    }, record)
  }

  const sfAliases = sfRows.map(r => ({
    sf_id: String(r['Id'] ?? ''),
    alias_raw: getField(r, aliasField),
    owner_name: getField(r, 'Owner.Name'),
  }))

  return NextResponse.json({
    rule: { id: rule.id, name: rule.name, sf_soql: rule.sf_soql, sf_alias_field: aliasField },
    participants: usersData,
    sf_row_count: sfRows.length,
    sf_aliases: sfAliases,
    soql_error: soqlError,
  })
}
