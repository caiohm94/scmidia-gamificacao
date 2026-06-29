import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import type { PlatformThemeRow } from '@/types/database'

async function getThemes(): Promise<PlatformThemeRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_themes')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as PlatformThemeRow[]
}

export default async function ThemesPage() {
  const themes = await getThemes()

  return (
    <div style={{ padding: '2rem', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a1a1a', fontFamily: 'var(--font-outfit, sans-serif)' }}>
            Temas
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#666', marginTop: '0.25rem' }}>
            O tema ativo define a aparência da tela de login.
          </p>
        </div>
        <Link
          href="/manager/themes/new"
          style={{
            background: '#8DB23C', color: '#fff', padding: '0.6rem 1.25rem',
            borderRadius: '0 0.6rem 0.6rem 0.6rem', textDecoration: 'none',
            fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-outfit, sans-serif)',
          }}
        >
          + Novo tema
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {themes.map(theme => (
          <ThemeCard key={theme.id} theme={theme} />
        ))}
        {themes.length === 0 && (
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Nenhum tema cadastrado.</p>
        )}
      </div>
    </div>
  )
}

function ThemeCard({ theme }: { theme: PlatformThemeRow }) {
  return (
    <div style={{
      background: '#fff',
      border: theme.is_active ? '2px solid #8DB23C' : '1px solid #e5e5e5',
      borderRadius: '0 0.75rem 0.75rem 0.75rem',
      padding: '1rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '1rem',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '0 0.5rem 0.5rem 0.5rem', flexShrink: 0,
        background: theme.bg_gradient, border: '1px solid rgba(0,0,0,0.08)',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', fontFamily: 'var(--font-outfit, sans-serif)', color: '#1a1a1a' }}>
            {theme.name}
          </span>
          {theme.is_active && (
            <span style={{
              background: '#8DB23C', color: '#fff', fontSize: '0.68rem', fontWeight: 700,
              padding: '0.1rem 0.45rem', borderRadius: '0 0.3rem 0.3rem 0.3rem', letterSpacing: '0.03em',
            }}>
              ATIVO
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.78rem', color: '#777', marginTop: '0.2rem' }}>{theme.subtitle}</p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem' }}>
          <ColorDot color={theme.primary_color} label="Primária" />
          <ColorDot color={theme.accent_color} label="Destaque" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        {!theme.is_active && <ActivateButton id={theme.id} />}
        <Link
          href={`/manager/themes/${theme.id}`}
          style={{
            padding: '0.4rem 0.85rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem',
            fontSize: '0.8rem', color: '#555', textDecoration: 'none', fontFamily: 'var(--font-outfit, sans-serif)',
          }}
        >
          Editar
        </Link>
      </div>
    </div>
  )
}

function ColorDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: '1px solid rgba(0,0,0,0.1)' }} />
      <span style={{ fontSize: '0.72rem', color: '#999' }}>{label}</span>
    </div>
  )
}

function ActivateButton({ id }: { id: string }) {
  async function activate() {
    'use server'
    const { createAdminClient: adminClient } = await import('@/lib/supabase/admin')
    const admin = adminClient()
    await admin.from('platform_themes').update({ is_active: false }).eq('is_active', true)
    await admin.from('platform_themes').update({ is_active: true }).eq('id', id)
    revalidatePath('/manager/themes')
  }

  return (
    <form action={activate}>
      <button
        type="submit"
        style={{
          padding: '0.4rem 0.85rem', background: '#f0f7e6', border: '1px solid #8DB23C',
          borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.8rem', color: '#5a7a25',
          cursor: 'pointer', fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600,
        }}
      >
        Ativar
      </button>
    </form>
  )
}
