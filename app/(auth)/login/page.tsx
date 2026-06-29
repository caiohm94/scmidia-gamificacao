import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import type { PlatformThemeRow } from '@/types/database'

async function getActiveTheme(): Promise<PlatformThemeRow | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('platform_themes')
      .select('*')
      .eq('is_active', true)
      .single()
    return data as PlatformThemeRow | null
  } catch {
    return null
  }
}

const fallbackTheme: PlatformThemeRow = {
  id: '',
  name: 'Missão Hexa',
  subtitle: 'Plataforma de Gamificação Comercial',
  bg_gradient: 'linear-gradient(145deg, #0a1a0e 0%, #0d2a14 50%, #071409 100%)',
  primary_color: '#8DB23C',
  accent_color: '#FFDF00',
  is_active: true,
  created_at: '',
}

export default async function LoginPage() {
  const theme = (await getActiveTheme()) ?? fallbackTheme

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: theme.bg_gradient, position: 'relative', overflow: 'hidden' }}
    >
      {/* Decorative shapes */}
      <div style={{ position: 'absolute', top: 40, right: 80, width: 180, height: 180, background: `${theme.primary_color}12`, borderRadius: '0 3rem 3rem 3rem', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 60, left: 60, width: 120, height: 120, background: `${theme.primary_color}0d`, borderRadius: '0 2rem 2rem 2rem', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '35%', left: '8%', width: 60, height: 60, background: `${theme.accent_color}0a`, borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '12%', width: 90, height: 90, background: `${theme.accent_color}08`, borderRadius: '0 1.5rem 1.5rem 1.5rem', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', padding: '0 1rem' }}>
        {/* 6 stars above card */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {[...Array(6)].map((_, i) => (
            <span key={i} style={{ color: theme.accent_color, fontSize: '0.85rem', opacity: 0.7 }}>★</span>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.045)',
          border: `1px solid ${theme.primary_color}30`,
          borderRadius: '0 1.5rem 1.5rem 1.5rem',
          padding: '2.5rem 2.25rem',
          backdropFilter: 'blur(16px)',
          boxShadow: `0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)`,
        }}>
          {/* SCMídia logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <Image
              src="/logo-scmidia.png"
              alt="SCMídia"
              width={110}
              height={32}
              className="object-contain"
              style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }}
            />
          </div>

          {/* Trophy + title */}
          <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <HexaTrophy accentColor={theme.accent_color} />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-outfit, sans-serif)',
              fontSize: '1.8rem', fontWeight: 800,
              color: theme.accent_color,
              letterSpacing: '-0.02em', marginBottom: '0.4rem',
              textShadow: `0 0 40px ${theme.accent_color}50`,
            }}>
              {theme.name}
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              {theme.subtitle}
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: `${theme.primary_color}30`, marginBottom: '1.75rem' }} />

          <GoogleLoginButton primaryColor={theme.primary_color} />

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)', marginTop: '1.25rem' }}>
            Acesso restrito a colaboradores SCMídia
          </p>
        </div>
      </div>
    </div>
  )
}

function HexaTrophy({ accentColor }: { accentColor: string }) {
  const gold = accentColor
  const dark = '#9a7800'
  const malachite = '#1a4a20'

  return (
    <svg width="84" height="100" viewBox="0 0 84 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left figure — head */}
      <ellipse cx="27" cy="8" rx="4.5" ry="4.5" fill={gold} />
      {/* Left figure — body + arms raised */}
      <path d="M23 12 L19 20 L27 18 Z" fill={gold} />
      <path d="M31 12 L27 18 L35 20 Z" fill={gold} />
      {/* Left arm reaching up to globe */}
      <line x1="27" y1="18" x2="33" y2="24" stroke={gold} strokeWidth="2.5" strokeLinecap="round" />

      {/* Right figure — head */}
      <ellipse cx="57" cy="8" rx="4.5" ry="4.5" fill={gold} />
      {/* Right figure — body + arms raised */}
      <path d="M53 12 L49 20 L57 18 Z" fill={gold} />
      <path d="M61 12 L57 18 L65 20 Z" fill={gold} />
      {/* Right arm reaching up to globe */}
      <line x1="57" y1="18" x2="51" y2="24" stroke={gold} strokeWidth="2.5" strokeLinecap="round" />

      {/* Globe */}
      <circle cx="42" cy="21" r="11" fill={gold} />
      <ellipse cx="42" cy="21" rx="11" ry="4.5" fill="none" stroke={dark} strokeWidth="1" opacity="0.5" />
      <line x1="31" y1="21" x2="53" y2="21" stroke={dark} strokeWidth="0.8" opacity="0.5" />
      <path d="M35 12 Q42 17 49 12" stroke={dark} strokeWidth="0.8" fill="none" opacity="0.4" />
      <path d="M35 30 Q42 25 49 30" stroke={dark} strokeWidth="0.8" fill="none" opacity="0.4" />

      {/* Handles */}
      <path d="M20 38 C6 38 4 54 7 58 C10 64 16 63 20 58" stroke={gold} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M64 38 C78 38 80 54 77 58 C74 64 68 63 64 58" stroke={gold} strokeWidth="5" strokeLinecap="round" fill="none" />

      {/* Cup body */}
      <path d="M20 32 L20 58 Q20 70 42 74 Q64 70 64 58 L64 32 Z" fill={gold} />

      {/* Top rim */}
      <ellipse cx="42" cy="32" rx="22" ry="6" fill={dark} opacity="0.55" />

      {/* Cup shine */}
      <path d="M28 40 Q31 56 29 67" stroke="rgba(255,255,255,0.18)" strokeWidth="3.5" strokeLinecap="round" fill="none" />

      {/* Stem */}
      <rect x="34" y="74" width="16" height="10" rx="2" fill={gold} />

      {/* Malachite band */}
      <rect x="12" y="84" width="60" height="5" rx="1.5" fill={malachite} />

      {/* Base */}
      <rect x="6" y="89" width="72" height="9" rx="2.5" fill={dark} />
      {/* Base highlight */}
      <rect x="8" y="90" width="68" height="3" rx="1.5" fill={gold} opacity="0.35" />
    </svg>
  )
}
