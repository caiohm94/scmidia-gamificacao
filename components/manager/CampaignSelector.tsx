'use client'
import { useRouter } from 'next/navigation'

interface Props {
  campaigns: { id: string; name: string }[]
  selected: string
}

export function CampaignSelector({ campaigns, selected }: Props) {
  const router = useRouter()
  if (campaigns.length <= 1) return null
  return (
    <select
      value={selected}
      onChange={e => router.push(`/manager/dashboard?campaign_id=${e.target.value}`)}
      style={{
        border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem',
        padding: '0.45rem 0.75rem', fontSize: '0.82rem', color: '#3F3E3E',
        fontFamily: 'var(--font-outfit, sans-serif)', background: '#fff',
        cursor: 'pointer', fontWeight: 600,
      }}
    >
      {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  )
}
