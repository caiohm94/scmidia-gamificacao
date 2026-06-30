'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, Search, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'

interface User { id: string; name: string; email: string; avatar_url?: string }
interface Props { campaignId: string; existingIds?: string[] }

export function ParticipantForm({ campaignId, existingIds = [] }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  async function handleOpen() {
    setOpen(true)
    setSelected(new Set())
    setQuery('')
    setFetching(true)
    const res = await fetch('/api/users')
    if (res.ok) {
      const all: User[] = await res.json()
      setUsers(all.filter(u => !existingIds.includes(u.id)))
    }
    setFetching(false)
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(u => u.id)))
  }

  async function handleSubmit() {
    if (selected.size === 0) return
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: Array.from(selected) }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao adicionar participantes'); return }
    toast.success(`${selected.size} participante(s) adicionado(s)!`)
    setOpen(false)
    router.refresh()
  }

  const filtered = query.trim()
    ? users.filter(u =>
        u.name?.toLowerCase().includes(query.toLowerCase()) ||
        u.email?.toLowerCase().includes(query.toLowerCase())
      )
    : users

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.4rem 0.9rem', fontSize: '0.82rem', fontWeight: 600,
          borderRadius: '0 0.4rem 0.4rem 0.4rem',
          border: '1.5px solid rgba(141,178,60,0.5)',
          color: '#5C7435', background: 'rgba(141,178,60,0.06)',
          cursor: 'pointer', fontFamily: 'var(--font-outfit, sans-serif)',
        }}
      >
        <UserPlus size={14} />
        Adicionar Vários
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{
            background: '#fff', borderRadius: '0 1rem 1rem 1rem',
            width: '100%', maxWidth: 480,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)' }}>
                Adicionar participantes
              </span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(63,62,62,0.4)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(63,62,62,0.06)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(63,62,62,0.35)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%', paddingLeft: 28, paddingRight: 10,
                    paddingTop: '0.38rem', paddingBottom: '0.38rem',
                    fontSize: '0.82rem', fontFamily: 'var(--font-outfit, sans-serif)',
                    border: '1px solid rgba(63,62,62,0.15)',
                    borderRadius: '0 0.35rem 0.35rem 0.35rem',
                    outline: 'none', color: '#3F3E3E',
                  }}
                />
              </div>
            </div>

            {/* Select all bar */}
            {filtered.length > 0 && (
              <div style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid rgba(63,62,62,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(63,62,62,0.6)', fontFamily: 'var(--font-outfit, sans-serif)' }}>
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    style={{ accentColor: '#8DB23C' }}
                  />
                  Selecionar todos ({filtered.length})
                </label>
                {selected.size > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#5C7435', fontWeight: 600, fontFamily: 'var(--font-outfit, sans-serif)' }}>
                    {selected.size} selecionado(s)
                  </span>
                )}
              </div>
            )}

            {/* User list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {fetching ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Carregando…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>
                  {query ? `Nenhum usuário encontrado para "${query}"` : 'Todos os usuários já estão na campanha.'}
                </div>
              ) : filtered.map((u, i) => (
                <label key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 1.25rem', cursor: 'pointer',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(63,62,62,0.05)',
                  background: selected.has(u.id) ? 'rgba(141,178,60,0.05)' : 'transparent',
                  transition: 'background 0.1s',
                }}>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                    style={{ accentColor: '#8DB23C', flexShrink: 0 }}
                  />
                  <Avatar src={u.avatar_url} name={u.name} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 500, color: '#3F3E3E', fontSize: '0.85rem', fontFamily: 'var(--font-outfit, sans-serif)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid rgba(63,62,62,0.08)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-outfit, sans-serif)', color: '#3F3E3E' }}>
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={selected.size === 0 || loading}
                style={{
                  padding: '0.45rem 1.1rem', fontSize: '0.82rem', fontWeight: 600,
                  borderRadius: '0 0.4rem 0.4rem 0.4rem', border: 'none',
                  background: selected.size === 0 ? 'rgba(63,62,62,0.1)' : '#8DB23C',
                  color: selected.size === 0 ? 'rgba(63,62,62,0.35)' : '#fff',
                  cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-outfit, sans-serif)',
                  transition: 'background 0.15s',
                }}
              >
                {loading ? 'Adicionando…' : `Adicionar${selected.size > 0 ? ` (${selected.size})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
