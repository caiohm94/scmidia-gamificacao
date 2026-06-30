'use client'
import { useEffect } from 'react'

export const THEMES = {
  black: {
    bg: '#0d1a0f',
    headerBg: 'rgba(13,26,15,0.95)',
    label: 'Black',
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
  useEffect(() => {
    localStorage.setItem('participant_theme', 'black')
    window.dispatchEvent(new CustomEvent('sc-theme', { detail: 'black' }))
  }, [])

  const t = THEMES.black
  const cssVars = Object.entries(t.vars).map(([k, v]) => `${k}:${v}`).join(';')

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: 'var(--p-text)', ...(t.vars as React.CSSProperties) }}>
      <style suppressHydrationWarning>{`:root{${cssVars}}`}</style>
      <header style={{ borderBottom: '1px solid var(--p-sub-border)', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, background: t.headerBg, backdropFilter: 'blur(8px)' }}>
        {headerContent}
      </header>
      <main style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.5rem' }}>
        {children}
      </main>
    </div>
  )
}
