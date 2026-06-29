import { createAdminClient } from '@/lib/supabase/admin'
import { getSalesforceConnection, executeSoql } from './client'

export type SyncResult = {
  rule_id: string
  rule_name: string
  inserted: number
  skipped: number
  errors: string[]
}

function getField(record: Record<string, unknown>, path: string): unknown {
  // Aggregate SOQL queries flatten relationship fields: 'Owner.Alias' becomes a literal key
  if (path in record) return record[path]
  // Regular SOQL queries use nested objects: { Owner: { Alias: '...' } }
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, record)
}

export async function syncRule(ruleId: string, triggeredBy: string): Promise<SyncResult> {
  const admin = createAdminClient()
  const result: SyncResult = { rule_id: ruleId, rule_name: '', inserted: 0, skipped: 0, errors: [] }

  const { data: rule, error: ruleErr } = await admin
    .from('scoring_rules')
    .select('id, name, points, campaign_id, sf_soql, sf_value_field, sf_alias_field')
    .eq('id', ruleId)
    .eq('data_origin', 'salesforce')
    .eq('is_active', true)
    .single()

  if (ruleErr || !rule) {
    result.errors.push(`Regra não encontrada ou não é do tipo Salesforce: ${ruleId}`)
    return result
  }

  result.rule_name = rule.name
  const aliasField = rule.sf_alias_field ?? 'Alias'
  const valueField = rule.sf_value_field!

  let sfRows: Record<string, unknown>[]
  try {
    const conn = await getSalesforceConnection()
    sfRows = await executeSoql(conn, rule.sf_soql!)
  } catch (err) {
    result.errors.push(`Erro SOQL: ${err instanceof Error ? err.message : String(err)}`)
    return result
  }

  const { data: participants } = await admin
    .from('campaign_participants')
    .select('user_id')
    .eq('campaign_id', rule.campaign_id)

  const userIds = (participants ?? []).map(p => p.user_id)

  const { data: usersData } = await admin
    .from('users')
    .select('id, sf_alias')
    .in('id', userIds)

  type ParticipantRow = { user_id: string; sf_alias: string | null }
  const participantList: ParticipantRow[] = (participants ?? []).map(p => ({
    user_id: p.user_id,
    sf_alias: usersData?.find(u => u.id === p.user_id)?.sf_alias ?? null,
  }))
  const { data: syncStates } = await admin
    .from('salesforce_sync_state')
    .select('user_id, last_value')
    .eq('scoring_rule_id', ruleId)
    .in('user_id', userIds)

  const stateMap = new Map<string, number>(
    (syncStates ?? []).map(s => [s.user_id, Number(s.last_value)])
  )

  const today = new Date().toISOString().slice(0, 10)

  for (const sfRow of sfRows) {
    const alias = String(getField(sfRow, aliasField) ?? '').trim()
    if (!alias) { result.skipped++; continue }

    const currentValue = Number(getField(sfRow, valueField) ?? 0)
    const participant = participantList.find(p => p.sf_alias === alias)
    if (!participant) { result.skipped++; continue }

    const lastValue = stateMap.get(participant.user_id) ?? 0
    const delta = currentValue - lastValue

    if (delta <= 0) { result.skipped++; continue }

    // points da regra = pontos por unidade de valor do SF
    const pointsToAdd = Math.round(delta * rule.points)

    const { error: txErr } = await admin.from('point_transactions').insert({
      campaign_id: rule.campaign_id,
      user_id: participant.user_id,
      scoring_rule_id: rule.id,
      points: pointsToAdd,
      event_date: today,
      description: `Sync Salesforce — ${rule.name}`,
      origin: 'salesforce',
      created_by: triggeredBy,
    })

    if (txErr) {
      result.errors.push(`Erro ao inserir para ${alias}: ${txErr.message}`)
      continue
    }

    await admin.from('salesforce_sync_state').upsert({
      scoring_rule_id: rule.id,
      user_id: participant.user_id,
      last_value: currentValue,
      last_synced_at: new Date().toISOString(),
    })

    result.inserted++
  }

  return result
}

export async function syncAllDueRules(triggeredBy: string): Promise<SyncResult[]> {
  const admin = createAdminClient()
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const currentDay = now.getDay()

  const { data: rules } = await admin
    .from('scoring_rules')
    .select('id, sf_frequency, sf_run_time, sf_run_day')
    .eq('data_origin', 'salesforce')
    .eq('is_active', true)

  const dueRules = (rules ?? []).filter(r => {
    if (r.sf_frequency === '5min') return true
    if (r.sf_frequency === 'daily') return r.sf_run_time?.slice(0, 5) === currentTime
    if (r.sf_frequency === 'weekly') return r.sf_run_day === currentDay && r.sf_run_time?.slice(0, 5) === currentTime
    return false
  })

  return Promise.all(dueRules.map(r => syncRule(r.id, triggeredBy)))
}
