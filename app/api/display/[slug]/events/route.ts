import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

// Admin-client endpoint for TV display polling — bypasses RLS.
// Authenticated by display_token query param (same as the display page).
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = req.nextUrl.searchParams.get('token')
  const since = req.nextUrl.searchParams.get('since') ?? new Date(0).toISOString()

  const admin = createAdminClient()

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, display_token, ends_at')
    .eq('slug', slug)
    .single()

  if (!campaign || campaign.display_token !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [celebrations, feed, ranking] = await Promise.all([
    admin
      .from('celebration_events')
      .select('id, user_id, points, rule_name, message, triggered_at, users(name, avatar_url)')
      .eq('campaign_id', campaign.id)
      .gt('triggered_at', since)
      .order('triggered_at', { ascending: true }),

    admin
      .from('feed_events')
      .select('id, event_type, payload, created_at, user_id')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(10),

    admin
      .from('campaign_rankings')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('position'),
  ])

  return NextResponse.json({
    celebrations: celebrations.data ?? [],
    feed: feed.data ?? [],
    ranking: ranking.data ?? [],
  })
}
