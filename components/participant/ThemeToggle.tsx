'use client'
import { useEffect, useState } from 'react'

export const THEMES = {
  padrao: {
    bg: '#ffffff',
    headerBg: '#0d1a0f',
    label: '🌿 Padrão',
    vars: {
      '--p-text':       '#0a1a0b',
      '--p-text-dim':   'rgba(10,26,11,0.82)',
      '--p-muted':      'rgba(10,26,11,0.48)',
      '--p-card-bg':    'rgba(0,0,0,0.04)',
      '--p-card-border':'rgba(0,0,0,0.1)',
      '--p-sub-border': 'rgba(0,0,0,0.07)',
      '--p-separator':  'rgba(0,0,0,0.05)',
      '--p-tag-bg':     'rgba(0,0,0,0.05)',
      '--p-track':      'rgba(0,0,0,0.1)',
    },
  },
  black: {
    bg: '#0d1a0f',
    headerBg: 'rgba(13,26,15,0.95)',
    label: '🌑 Black',
    vars: {
      '--p-text':       '#ffffff',
      '--p-text-dim':   'rgba(255,255,255,0.85)',
      '--p-muted':      'rgba(255,255,255,0.35)',
      '--p-card-bg':    'rgba(255,255,255,0.03)',
      '--p-card-border':'rgba(255,255,255,0.08)',
      '--p-sub-border': 'rgba(255,255,255,0.06)',
      '--p-separator':  'rgba(255,255,255,0.04)',
      '--p-tag-bg':     'rgba(255,255,255,0.06)',
      '--p-track':      'rgba(255,255,255,0.08)',
    },
  },
}
type ThemeKey = keyof typeof THEMES

export function ThemeWrapper({ children, headerContent }: { children: React.ReactNode; headerContent: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>('padrao')

  useEffect(() => {
    const saved = (localStorage.getItem('participant_theme') ?? 'padrao') as ThemeKey
    if (saved in THEMES) setTheme(saved)
  }, [])

  function pick(key: ThemeKey) {
    setTheme(key)
    localStorage.setItem('participant_theme', key)
  }

  const t = THEMES[theme]

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: 'var(--p-text)', transition: 'background 0.3s', ...(t.vars as React.CSSProperties) }}>
      <header style={{ borderBottom: '1px solid var(--p-sub-border)', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, background: t.headerBg, backdropFilter: 'blur(8px)', transition: 'background 0.3s' }}>
        {headerContent}
      </header>

      {/* Floating theme toggle — bottom-right */}
      <div style={{
        position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 200,
        display: 'flex', alignItems: 'center',
        background: 'rgba(13,26,15,0.85)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.2rem', gap: '0.1rem',
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', padding: '0 0.4rem', whiteSpace: 'nowrap' }}>Tema</span>
        {(Object.keys(THEMES) as ThemeKey[]).map(key => (
          <button
            key={key}
            onClick={() => pick(key)}
            style={{
              fontSize: '0.72rem', fontWeight: theme === key ? 600 : 400,
              color: theme === key ? '#fff' : 'rgba(255,255,255,0.35)',
              background: theme === key ? 'rgba(255,255,255,0.14)' : 'none',
              border: 'none', borderRadius: '0 0.3rem 0.3rem 0.3rem',
              padding: '0.25rem 0.6rem', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {THEMES[key].label}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.5rem' }}>
        {children}
      </main>
    </div>
  )
}
