'use client'
import { useState } from 'react'
import { Avatar } from '@/components/shared/Avatar'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { UserProfile } from '@/types/database'

export function UsersTable({ users }: { users: UserProfile[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? users.filter(u =>
        u.name?.toLowerCase().includes(query.toLowerCase()) ||
        u.email?.toLowerCase().includes(query.toLowerCase())
      )
    : users

  return (
    <div>
      {/* Search bar */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(63,62,62,0.35)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: 12,
              paddingTop: '0.4rem',
              paddingBottom: '0.4rem',
              fontSize: '0.82rem',
              border: '1px solid rgba(63,62,62,0.15)',
              borderRadius: '0 0.4rem 0.4rem 0.4rem',
              outline: 'none',
              fontFamily: 'var(--font-outfit, sans-serif)',
              color: '#3F3E3E',
              background: 'rgba(63,62,62,0.02)',
            }}
          />
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'rgba(63,62,62,0.04)', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
            {['Usuário', 'Time', 'Função', 'Status', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 500, fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)', letterSpacing: '0.03em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>
                Nenhum usuário encontrado para "{query}"
              </td>
            </tr>
          ) : filtered.map((u, i) => (
            <tr key={u.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(63,62,62,0.07)' }}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar src={u.avatar_url} name={u.name} size={32} />
                  <div>
                    <p style={{ fontWeight: 500, color: '#3F3E3E' }}>{u.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)' }}>{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {u.teams && (
                  <span style={{ display: 'inline-flex', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 500, borderRadius: '0 0.35rem 0.35rem 0.35rem', background: (u.teams.color ?? '#8DB23C') + '22', color: u.teams.color ?? '#8DB23C' }}>
                    {u.teams.name}
                  </span>
                )}
              </td>
              <td className="px-4 py-3" style={{ color: 'rgba(63,62,62,0.6)', fontSize: '0.85rem' }}>{u.function}</td>
              <td className="px-4 py-3">
                <span style={{
                  display: 'inline-flex', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 500,
                  borderRadius: '0 0.35rem 0.35rem 0.35rem',
                  background: u.status === 'active' ? 'rgba(141,178,60,0.12)' : 'rgba(63,62,62,0.06)',
                  color: u.status === 'active' ? '#5C7435' : 'rgba(63,62,62,0.45)',
                }}>
                  {u.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {u.role === 'participant' && (
                    <Link href={`/manager/preview/${u.id}`}>
                      <button className="sc-btn-outline text-xs cursor-pointer" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: '#8DB23C', borderColor: 'rgba(141,178,60,0.4)' }}>Ver painel</button>
                    </Link>
                  )}
                  <Link href={`/manager/users/${u.id}`}>
                    <button className="sc-btn-outline text-xs cursor-pointer" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Editar</button>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
