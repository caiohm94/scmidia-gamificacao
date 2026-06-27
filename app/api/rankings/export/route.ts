import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRanking } from '@/lib/rankings/queries'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaign_id = searchParams.get('campaign_id')

  if (!campaign_id) {
    return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify authenticated manager session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ranking = await getRanking(supabase, { campaign_id })

  const header = 'Posição,Nome,Time,Função,Pontos Totais,Sequência Atual,Maior Sequência\n'
  const rows = ranking
    .map(r =>
      [
        r.position,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${(r.team_name ?? '').replace(/"/g, '""')}"`,
        `"${r.function}"`,
        r.total_points,
        r.current_streak,
        r.longest_streak,
      ].join(',')
    )
    .join('\n')

  const csv = header + rows

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ranking-${campaign_id}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
