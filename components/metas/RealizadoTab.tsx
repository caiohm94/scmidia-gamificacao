'use client'

type Participant = { id: string; name: string }
type Rule = { id: string; name: string; points: number; target_period: string | null }

interface Props {
  ruleId: string
  campaignId: string
  month: string
  participants: Participant[]
  rule: Rule
}

// Placeholder — full implementation in Task 7
export function RealizadoTab({ ruleId, campaignId, month, participants, rule }: Props) {
  return (
    <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>
      Realizado (em breve)
    </p>
  )
}
