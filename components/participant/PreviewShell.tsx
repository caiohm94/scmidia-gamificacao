'use client'
import { useEffect, useState } from 'react'

const THEMES = {
  padrao: { bg: '#0d1a0f', headerBg: 'rgba(13,26,15,0.95)', label: '🌿 Padrão' },
  black:  { bg: '#050505', headerBg: 'rgba(5,5,5,0.97)',    label: '🌑 Black'  },
}
type ThemeKey = keyof typeof THEMES

export function PreviewShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>('padrao')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('participant_theme') ?? 'padrao') as ThemeKey
    if (saved in THEMES) setTheme(saved)
    setMounted(true)
  }, [])

  function pick(key: ThemeKey) {
    setTheme(key)
    localStorage.setItem('participant_theme', key)
  }

  const t = THEMES[theme]

  return (
    <div style={{ minHeight: '100vh', background: mounted ? t.bg : '#0d1a0f', color: '#fff', transition: 'background 0.3s' }}>
      {/* Tema toggle — flutuante no canto superior direito da área do conteúdo */}
      <div style={{
        position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 200,
        display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
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
      {children}
    </div>
  )
}
