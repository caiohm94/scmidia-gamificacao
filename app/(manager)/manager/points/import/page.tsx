import { requireRole } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import { CsvImporter } from '@/components/points/CsvImporter'
import { Upload } from 'lucide-react'

export default async function ImportPage() {
  await requireRole('manager')
  const supabase = await createClient()

  const [{ data: campaigns }, { data: users }, { data: rules }] = await Promise.all([
    supabase.from('campaigns').select('id, name').eq('status', 'active'),
    supabase.from('users').select('id, name, email').eq('status', 'active').order('name'),
    supabase.from('scoring_rules').select('id, name, campaign_id').eq('is_active', true),
  ])

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={18} color="#8DB23C" />
          </div>
          <div>
            <h1 className="sc-page-title">Importar CSV</h1>
            <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.45)', fontFamily: 'var(--font-outfit, sans-serif)', marginTop: '0.1rem' }}>
              Lance múltiplos pontos de uma vez via planilha
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <CsvImporter
          campaigns={campaigns ?? []}
          users={users ?? []}
          rules={rules ?? []}
        />
      </div>
    </div>
  )
}
