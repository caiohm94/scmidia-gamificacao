'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ManagerNav } from './ManagerNav'
import { PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react'

export function ManagerShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside
        style={{
          width: collapsed ? 56 : 224, flexShrink: 0,
          backgroundColor: '#3F3E3E', display: 'flex', flexDirection: 'column',
          transition: 'width 0.2s ease', overflow: 'hidden',
        }}
      >
        {/* Logo + toggle */}
        <div style={{ padding: collapsed ? '1rem 0.75rem' : '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: '0.5rem', minHeight: 64 }}>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <Image src="/logo-scmidia.png" alt="SCMídia" width={100} height={30} className="object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
              <p style={{ fontSize: '0.7rem', color: '#8DB23C', fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 500, marginTop: '0.25rem', whiteSpace: 'nowrap' }}>Painel do Gestor</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'rgba(255,255,255,0.4)', borderRadius: '0 0.4rem 0.4rem 0.4rem', flexShrink: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#8DB23C')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Nav — oculta labels quando collapsed */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ManagerNav collapsed={collapsed} />
        </div>

        {/* Footer: sair */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: collapsed ? '0.75rem 0' : '0.75rem 0.75rem' }}>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              title="Sair"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)', padding: collapsed ? '0.5rem 0' : '0.5rem 0.75rem',
                borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.82rem',
                fontFamily: 'var(--font-outfit, sans-serif)', transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              <LogOut size={15} />
              {!collapsed && 'Sair'}
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#F5F5F3' }}>
        {children}
      </main>
    </div>
  )
}
