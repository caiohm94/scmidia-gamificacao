'use client'
import { useEffect, useState } from 'react'

const THEMES = {
  padrao: { bg: '#0d1a0f', headerBg: 'rgba(13,26,15,0.95)', label: '🌿 Padrão' },
  black:  { bg: '#050505', headerBg: 'rgba(5,5,5,0.97)',    label: '🌑 Black'  },
}
type ThemeKey = keyof typeof THEMES

export function ThemeWrapper({ children, headerContent }: { children: React.ReactNode; headerContent: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>('padrao')

  useEffect(() => {
    const saved = (localStorage.getItem('participant_theme') ?? 'padrao') as ThemeKey
    if (saved in THEMES) setTheme(saved)
  }, [])

  function toggle() {
    const next: ThemeKey = theme === 'padrao' ? 'black' : 'padrao'
    setTheme(next)
    localStorage.setItem('participant_theme', next)
  }

  const t = THEMES[theme]

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: '#ffffff', transition: 'background 0.3s' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, background: t.headerBg, backdropFilter: 'blur(8px)', transition: 'background 0.3s' }}>
        {headerContent}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.15rem', gap: '0.1rem', marginLeft: '0.5rem', flexShrink: 0 }}>
          {(Object.keys(THEMES) as ThemeKey[]).map(key => (
            <button
              key={key}
              onClick={() => { setTheme(key); localStorage.setItem('participant_theme', key) }}
              style={{
                fontSize: '0.72rem', fontWeight: theme === key ? 600 : 400,
                color: theme === key ? '#fff' : 'rgba(255,255,255,0.35)',
                background: theme === key ? 'rgba(255,255,255,0.12)' : 'none',
                border: 'none', borderRadius: '0 0.3rem 0.3rem 0.3rem',
                padding: '0.2rem 0.55rem', cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {THEMES[key].label}
            </button>
          ))}
        </div>
      </header>
      <main style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.5rem' }}>
        {children}
      </main>
    </div>
  )
}
