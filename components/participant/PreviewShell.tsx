'use client'
import { useEffect } from 'react'
import { THEMES } from './ThemeToggle'

export function PreviewShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.setItem('participant_theme', 'black')
    window.dispatchEvent(new CustomEvent('sc-theme', { detail: 'black' }))
  }, [])

  const t = THEMES.black
  const cssVars = Object.entries(t.vars).map(([k, v]) => `${k}:${v}`).join(';')

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: 'var(--p-text)', ...(t.vars as React.CSSProperties) }}>
      <style suppressHydrationWarning>{`:root{${cssVars}}`}</style>
      {children}
    </div>
  )
}
