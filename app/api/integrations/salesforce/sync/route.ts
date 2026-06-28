import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncRule, syncAllDueRules } from '@/lib/salesforce/sync'
import { NextResponse, type NextRequest } from 'next/server'

function isCronAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
}

async function getManagerId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  return profile?.role === 'manager' ? user.id : null
}

async function getFirstManagerId(): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('id').eq('role', 'manager').eq('status', 'active').limit(1).single()
  return data?.id ?? null
}

export async function POST(request: NextRequest) {
  let triggeredBy: string | null = null

  if (isCronAuthorized(request)) {
    triggeredBy = await getFirstManagerId()
  } else {
    triggeredBy = await getManagerId()
  }

  if (!triggeredBy) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { rule_id?: string }

  if (body.rule_id) {
    const result = await syncRule(body.rule_id, triggeredBy)
    return NextResponse.json({ results: [result] })
  }

  const results = await syncAllDueRules(triggeredBy)
  return NextResponse.json({ results })
}
