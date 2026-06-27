# Edge Function: reset-streaks

Resets `current_streak` to `0` for all campaign participants who had no activity in the last 24 hours. A streak is considered active only if `last_activity_date` equals today or yesterday (UTC).

## Cron Schedule

Runs daily at **03:00 UTC** via Supabase Edge Function scheduler:

```
0 3 * * *
```

Configure in **Supabase Dashboard → Edge Functions → reset-streaks → Schedule**.

## Behavior

1. Computes today's and yesterday's dates in UTC.
2. Updates `campaign_participants.current_streak = 0` where `last_activity_date` is not in `{today, yesterday}` **and** `current_streak > 0`.
3. Returns `{ success: true, reset: <count>, date: "<YYYY-MM-DD>" }`.

## Environment Variables Required

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Project URL (auto-injected by Supabase runtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for bypassing RLS (auto-injected) |

## Manual Invocation

```bash
supabase functions invoke reset-streaks --no-verify-jwt
```
