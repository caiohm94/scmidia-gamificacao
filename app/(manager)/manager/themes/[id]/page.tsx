'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { PlatformThemeRow } from '@/types/database'

export default function EditThemePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [theme, setTheme] = useState<PlatformThemeRow | null>(null)
  const [form, setForm] = useState({
    name: '', subtitle: '', bg_gradient: '', primary_color: '#8DB23C', accent_color: '#FFDF00',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/themes')
      .then(r => r.json())
      .then((themes: PlatformThemeRow[]) => {
        const t = themes.find(x => x.id === params.id)
        if (t) {
          setTheme(t)
          setForm({ name: t.name, subtitle: t.subtitle, bg_gradient: t.bg_gradient, primary_color: t.primary_color, accent_color: t.accent_color })
        }
      })
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/themes/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Erro ao salvar')
      setSaving(false)
      return
    }
    router.push('/manager/themes')
  }

  async function handleDelete() {
    if (!confirm('Excluir este tema?')) return
    setDeleting(true)
    const res = await fetch(`/api/themes/${params.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json()
      alert(j.error ?? 'Erro ao excluir')
      setDeleting(false)
      return
    }
    router.push('/manager/themes')
  }

  if (!theme) return <div style={{ padding: '2rem', color: '#999' }}>Carregando...</div>

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #ddd',
    borderRadius: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.88rem',
    fontFamily: 'var(--font-outfit, sans-serif)', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    display: 'block', fontSize: '0.82rem', fontWeight: 600 as const,
    color: '#333', marginBottom: '0.35rem', fontFamily: 'var(--font-outfit, sans-serif)',
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-outfit, sans-serif)' }}>
          Editar tema
        </h1>
        {!theme.is_active && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: 'none', border: '1px solid #e53e3e', color: '#e53e3e',
              padding: '0.4rem 0.85rem', borderRadius: '0 0.4rem 0.4rem 0.4rem',
              cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font-outfit, sans-serif)',
            }}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Nome do tema</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Subtítulo</label>
          <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Gradiente de fundo (CSS)</label>
          <textarea
            value={form.bg_gradient}
            onChange={e => setForm(f => ({ ...f, bg_gradient: e.target.value }))}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }}
          />
          <div style={{ marginTop: '0.5rem', height: 32, borderRadius: '0 0.3rem 0.3rem 0.3rem', background: form.bg_gradient }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Cor primária</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
              <input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Cor de destaque</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
              <input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
            </div>
          </div>
        </div>

        {error && <p style={{ color: '#e53e3e', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{
            background: saving ? '#aaa' : '#8DB23C', color: '#fff', border: 'none',
            padding: '0.7rem 1.5rem', borderRadius: '0 0.6rem 0.6rem 0.6rem',
            fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-outfit, sans-serif)',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
