import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const statusLabel: Record<string, string> = { draft: 'Rascunho', active: 'Ativa', closed: 'Encerrada' }
const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary', active: 'default', closed: 'outline'
}

export default async function CampaignsPage() {
  await requireRole('manager')
  const supabase = await createClient()
  const { data: campaigns } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <Link href="/manager/campaigns/new"><Button>Nova campanha</Button></Link>
      </div>
      <div className="grid gap-4">
        {campaigns?.map(c => (
          <div key={c.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{c.name}</h2>
                <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{c.description}</p>
              {c.starts_at && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(c.starts_at), "dd 'de' MMM yyyy", { locale: ptBR })}
                  {c.ends_at && ` → ${format(new Date(c.ends_at), "dd 'de' MMM yyyy", { locale: ptBR })}`}
                </p>
              )}
            </div>
            <Link href={`/manager/campaigns/${c.id}`}>
              <Button variant="outline" size="sm">Gerenciar</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
