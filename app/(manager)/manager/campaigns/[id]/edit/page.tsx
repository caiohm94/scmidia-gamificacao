import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { CampaignForm } from '@/components/campaign/CampaignForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { CampaignInput } from '@/schemas/campaign'
import { Trophy } from 'lucide-react'

type Props = { params: Promise<{ id: string }> }

export default async function EditCampaignPage({ params }: Props) {
  await requireRole('manager')
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns').select('*').eq('id', id).single()

  if (!campaign) notFound()

  const defaultValues: Partial<CampaignInput> = {
    name: campaign.name,
    slug: campaign.slug,
    description: campaign.description ?? undefined,
    rules: campaign.rules ?? undefined,
    prizes: campaign.prizes ?? undefined,
    status: campaign.status,
    starts_at: campaign.starts_at ? campaign.starts_at.slice(0, 16) : undefined,
    ends_at: campaign.ends_at ? campaign.ends_at.slice(0, 16) : undefined,
  }

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={18} color="#8DB23C" />
          </div>
          <div>
            <h1 className="sc-page-title">Editar campanha</h1>
            <p style={{ fontSize: '0.8rem', color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit, sans-serif)' }}>{campaign.name}</p>
          </div>
        </div>
        <Link href={`/manager/campaigns/${id}`}>
          <button className="sc-btn-outline text-sm cursor-pointer">← Voltar</button>
        </Link>
      </div>
      <div className="p-6">
        <div className="sc-card max-w-2xl">
          <CampaignForm defaultValues={defaultValues} campaignId={id} />
        </div>
      </div>
    </div>
  )
}
