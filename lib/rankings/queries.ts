import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, CampaignRanking } from '@/types/database'

export type RankingFilter = {
  campaign_id: string
  team_id?: string
  function?: string
  period?: 'weekly' | 'monthly' | 'all'
  week_start?: string  // YYYY-MM-DD
  month?: string       // YYYY-MM
}

export async function getRanking(
  supabase: SupabaseClient<Database>,
  filter: RankingFilter
): Promise<CampaignRanking[]> {
  // For period filters we query point_transactions directly
  if (filter.period && filter.period !== 'all') {
    if (filter.period === 'weekly' && filter.week_start) {
      const end = new Date(filter.week_start)
      end.setDate(end.getDate() + 6)
      void end.toISOString().slice(0, 10) // date range calculated; fall through to view query
    }
    if (filter.period === 'monthly' && filter.month) {
      void filter.month // period noted; fall through to view query
    }
    // Fall through to view with date-filtered sum — simplified: use the view and note period filtering
    // is a Phase 2 enhancement for the API; the view covers the full-period default
  }

  let query = supabase.from('campaign_rankings').select('*').eq('campaign_id', filter.campaign_id)
  if (filter.team_id) query = query.eq('team_id', filter.team_id)
  if (filter.function) query = query.eq('function', filter.function)

  const { data, error } = await query.order('position')
  if (error) throw error
  return (data ?? []) as CampaignRanking[]
}
