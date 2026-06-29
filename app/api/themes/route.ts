import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const themeSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  subtitle: z.string().default('Plataforma de Gamificação Comercial'),
  bg_gradient: z.string().min(1),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
})

async function requireManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  return profile?.role === 'manager' ? user : null
}

export async function GET() {
  const user = await requireManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_themes')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const user = await requireManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = themeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('platform_themes')
    .insert(parsed.data)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
