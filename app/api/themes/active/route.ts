import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('platform_themes')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error) return NextResponse.json(null)
  return NextResponse.json(data)
}
