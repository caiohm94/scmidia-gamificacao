import { createAdminClient } from '@/lib/supabase/admin'
import { getSalesforceConnection, executeSoql } from './client'

export type ImportResult = {
  rule_id: string
  rule_name: string
  inserted: number
  skipped: number
  errors: string[]
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

export async function importRule(ruleId: string, triggeredBy: string): Promise<ImportResult> {
  const admin = createAdminClient()
  const result: ImportResult = { rule_id: ruleId, rule_name: '', inserted: 0, skipped: 0, errors: [] }

  const { data: rule, error: ruleErr } = await admin
    .from('scoring_rules')
    .select('id, name, points, campaign_id, sf_soql, sf_alias_field')
    .eq('id', ruleId)
    .eq('data_origin', 'salesforce')
    .eq('is_active', true)
    .single()

  if (ruleErr || !rule) {
    result.errors.push(`Regra não encontrada ou inativa: ${ruleId}`)
    return result
  }

  result.rule_name = rule.name
  const aliasField = rule.sf_alias_field ?? 'Owner.Alias'

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
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

  type ParticipantRow = { user_id: string; sf_alias: string | null }
  const participantList: ParticipantRow[] = (participants ?? []).map(p => ({
    user_id: p.user_id,
    sf_alias: usersData?.find(u => u.id === p.user_id)?.sf_alias ?? null,
  }))

  const sfIds = sfRows
    .map(r => String(r['Id'] ?? '').trim())
    .filter(Boolean)

  const { data: existing } = await admin
    .from('salesforce_records')
    .select('sf_id')
    .eq('scoring_rule_id', ruleId)
    .in('sf_id', sfIds.length > 0 ? sfIds : ['__none__'])

  const existingSet = new Set((existing ?? []).map(e => e.sf_id))

  const today = new Date().toISOString().slice(0, 10)

  for (const sfRow of sfRows) {
    const sfId = String(sfRow['Id'] ?? '').trim()
    if (!sfId) { result.skipped++; continue }

    if (existingSet.has(sfId)) { result.skipped++; continue }

    const alias = String(getField(sfRow, aliasField) ?? '').trim()
    const ownerName = String(getField(sfRow, 'Owner.Name') ?? getField(sfRow, 'Name') ?? '').trim() || null
    const accountName = String(getField(sfRow, 'Account.Name') ?? sfRow['AccountName'] ?? '').trim() || null
    const description = String(sfRow['Description'] ?? sfRow['Subject'] ?? '').trim() || null
    const sfCreatedAt = sfRow['CreatedDate'] ? String(sfRow['CreatedDate']) : null

    const participant = alias ? participantList.find(p => p.sf_alias === alias) : undefined

    let transactionId: string | null = null

    if (participant) {
      const { data: txRows, error: txErr } = await admin
        .from('point_transactions')
        .insert({
          campaign_id: rule.campaign_id,
          user_id: participant.user_id,
          scoring_rule_id: rule.id,
          points: rule.points,
          event_date: today,
          description: `SF Import — ${rule.name}${accountName ? ` (${accountName})` : ''}`,
          origin: 'salesforce',
          created_by: triggeredBy,
        })
        .select('id')

      if (txErr) {
        result.errors.push(`Erro transação para ${alias}: ${txErr.message}`)
        continue
      }
      transactionId = txRows?.[0]?.id ?? null
    }

    const { error: recErr } = await admin
      .from('salesforce_records')
      .insert({
        scoring_rule_id: rule.id,
        campaign_id: rule.campaign_id,
        sf_id: sfId,
        sf_created_at: sfCreatedAt,
        owner_name: ownerName,
        sf_alias: alias || null,
        account_name: accountName,
        description,
        user_id: participant?.user_id ?? null,
        transaction_id: transactionId,
      })

    if (recErr) {
      console.error('[SF import] salesforce_records insert failed', {
        sfId, code: recErr.code, message: recErr.message, details: recErr.details, hint: recErr.hint,
      })
      result.errors.push(`SF record ${sfId}: [${recErr.code}] ${recErr.message}${recErr.details ? ' — ' + recErr.details : ''}`)
      continue
    }

    if (participant) result.inserted++
    else result.skipped++
  }

  const status = result.errors.length > 0 && result.inserted === 0 ? 'error'
    : result.errors.length > 0 ? 'partial'
    : result.inserted > 0 ? 'success'
    : 'no_match'

  await admin.from('salesforce_sync_logs').insert({
    rule_id: ruleId,
    rule_name: result.rule_name,
    triggered_by: triggeredBy,
    sf_found: sfRows.length,
    inserted: result.inserted,
    skipped: result.skipped,
    errors: result.errors,
    status,
  })

  return result
}
