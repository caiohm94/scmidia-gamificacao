import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { CampaignForm } from '@/components/campaign/CampaignForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { CampaignInput } from '@/schemas/campaign'

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
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/manager/campaigns/${id}`}>
          <Button variant="outline" size="sm">← Voltar</Button>
        </Link>
        <h1 className="text-2xl font-bold">Editar campanha</h1>
      </div>
      <CampaignForm defaultValues={defaultValues} campaignId={id} />
    </div>
  )
}
