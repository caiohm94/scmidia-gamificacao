import { requireRole } from '@/lib/auth/helpers'
import { CampaignForm } from '@/components/campaign/CampaignForm'
import Link from 'next/link'
import { Trophy } from 'lucide-react'

export default async function NewCampaignPage() {
  await requireRole('manager')
  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Nova Campanha</h1>
        </div>
        <Link href="/manager/campaigns">
          <button className="sc-btn-outline text-sm cursor-pointer">← Voltar</button>
        </Link>
      </div>
      <div className="p-6">
        <div className="sc-card max-w-2xl">
          <CampaignForm />
        </div>
      </div>
    </div>
  )
}
