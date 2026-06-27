import { requireRole } from '@/lib/auth/helpers'
import { CampaignForm } from '@/components/campaign/CampaignForm'

export default async function NewCampaignPage() {
  await requireRole('manager')
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Nova Campanha</h1>
      <CampaignForm />
    </div>
  )
}
