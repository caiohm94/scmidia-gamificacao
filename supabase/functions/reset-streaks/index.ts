import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Reset current_streak to 0 for participants who had no activity yesterday or today
  // A streak is broken when last_activity_date is neither today nor yesterday
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('campaign_participants')
    .update({ current_streak: 0 })
    .not('last_activity_date', 'in', `(${todayStr},${yesterdayStr})`)
    .gt('current_streak', 0)

  if (error) {
    console.error('Error resetting streaks:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resetCount = Array.isArray(data) ? data.length : 0
  console.log(`Streak reset complete. Rows affected: ${resetCount}`)

  return new Response(
    JSON.stringify({ success: true, reset: resetCount, date: todayStr }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
