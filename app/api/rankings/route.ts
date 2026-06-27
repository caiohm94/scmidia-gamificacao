import { createClient } from '@/lib/supabase/server'
import { getRanking } from '@/lib/rankings/queries'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaign_id = searchParams.get('campaign_id')
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

  const supabase = await createClient()
  try {
    const ranking = await getRanking(supabase, {
      campaign_id,
      team_id: searchParams.get('team_id') ?? undefined,
      function: searchParams.get('function') ?? undefined,
      period: (searchParams.get('period') as 'weekly' | 'monthly' | 'all') ?? 'all',
      week_start: searchParams.get('week_start') ?? undefined,
      month: searchParams.get('month') ?? undefined,
    })
    return NextResponse.json(ranking)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
