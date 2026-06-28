'use client'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarToggle({ collapsed, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem',
        color: 'rgba(255,255,255,0.45)', borderRadius: '0 0.4rem 0.4rem 0.4rem',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#8DB23C')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
    >
      {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
    </button>
  )
}
