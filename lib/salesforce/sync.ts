import { createAdminClient } from '@/lib/supabase/admin'
import { importRule, type ImportResult } from './import'

export type SyncResult = ImportResult

export async function syncRule(ruleId: string, triggeredBy: string): Promise<SyncResult> {
  return importRule(ruleId, triggeredBy)
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
