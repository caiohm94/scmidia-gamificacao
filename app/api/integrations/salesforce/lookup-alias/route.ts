import { createClient } from '@/lib/supabase/server'
import { getSalesforceConnection } from '@/lib/salesforce/client'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const email = request.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  try {
    const conn = await getSalesforceConnection()
    // Query SF User by email to get their Alias
    const result = await conn.query<{ Alias: string }>(
      `SELECT Alias FROM User WHERE Email = '${email.replace(/'/g, "\\'")}' AND IsActive = true LIMIT 1`
    )
    const alias = result.records[0]?.Alias ?? null
    return NextResponse.json({ alias, found: alias !== null })
  } catch (err) {
    return NextResponse.json({ alias: null, found: false, error: err instanceof Error ? err.message : String(err) })
  }
}
