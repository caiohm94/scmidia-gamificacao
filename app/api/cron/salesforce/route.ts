import { createAdminClient } from '@/lib/supabase/admin'
import { syncRule } from '@/lib/salesforce/sync'
import { NextResponse, type NextRequest } from 'next/server'

// Called by Vercel Cron (Authorization: Bearer CRON_SECRET)
// or by cron-job.org with the same header.
// Syncs ALL active Salesforce rules — deduplication inside importRule() prevents double-imports.

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find first active manager to use as created_by
  const { data: mgr } = await admin
    .from('users')
    .select('id')
    .eq('role', 'manager')
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!mgr) {
    return NextResponse.json({ error: 'No active manager found' }, { status: 500 })
  }

  // Get ALL active Salesforce rules (no frequency filtering)
  const { data: rules } = await admin
    .from('scoring_rules')
    .select('id, name')
    .eq('data_origin', 'salesforce')
    .eq('is_active', true)

  if (!rules || rules.length === 0) {
    return NextResponse.json({ message: 'No active Salesforce rules', results: [] })
  }

  const results = await Promise.all(rules.map(r => syncRule(r.id, mgr.id)))

  const summary = {
    total_rules: rules.length,
    total_inserted: results.reduce((s, r) => s + r.inserted, 0),
    total_skipped: results.reduce((s, r) => s + r.skipped, 0),
    results,
  }

  console.log('[cron/salesforce]', JSON.stringify(summary))
  return NextResponse.json(summary)
}
