'use client'

interface Campaign {
  id: string
  name: string
}

interface Rule {
  id: string
  name: string
  points: number
  target_period: string | null
  campaign_id: string
}

interface Participant {
  id: string
  name: string
}

interface MetasPageProps {
  campaigns: Campaign[]
  rules: Rule[]
  participants: Participant[]
  initialCampaignId: string
  initialRuleId: string
  initialMonth: string
  initialTab: string
}

export function MetasPage({
  campaigns,
  rules,
  participants,
  initialCampaignId,
  initialRuleId,
  initialMonth,
  initialTab,
}: MetasPageProps) {
  return (
    <div>
      <p>Metas page (Task 6)</p>
    </div>
  )
}
