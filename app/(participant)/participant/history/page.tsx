import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type HistoryRow = {
  id: string
  points: number
  event_date: string
  status: string
  origin: string
  description: string | null
  scoring_rules: { name: string } | null
  campaigns: { name: string } | null
}

export default async function HistoryPage() {
  await requireRole('participant')
  const user = await getSessionUser()
  const supabase = await createClient()

  const { data: rawPoints } = await supabase
    .from('point_transactions')
    .select('*, scoring_rules(name), campaigns(name)')
    .eq('user_id', user!.id)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })

  const points = (rawPoints ?? []) as HistoryRow[]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Histórico de Pontos</h1>
      <div className="space-y-2">
        {points.map(pt => (
          <div key={pt.id} className={`flex items-center justify-between p-4 rounded-lg border ${pt.status === 'reversed' ? 'border-gray-700 opacity-50' : 'border-gray-700 bg-gray-900'}`}>
            <div className="space-y-0.5">
              <p className="font-medium">{pt.scoring_rules?.name ?? 'Bônus'}</p>
              <p className="text-xs text-gray-400">{pt.campaigns?.name}</p>
              {pt.description && <p className="text-xs text-gray-500">{pt.description}</p>}
            </div>
            <div className="text-right space-y-1">
              <Badge variant={pt.points > 0 ? 'default' : 'destructive'} className="text-sm">
                {pt.points > 0 ? '+' : ''}{pt.points} pts
              </Badge>
              <p className="text-xs text-gray-400">
                {format(new Date(pt.event_date), "dd 'de' MMM yyyy", { locale: ptBR })}
              </p>
              {pt.status === 'reversed' && <p className="text-xs text-red-400">Estornado</p>}
              <p className="text-xs text-gray-600">{pt.origin}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
