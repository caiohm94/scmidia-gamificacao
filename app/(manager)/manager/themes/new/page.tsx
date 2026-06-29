'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormState = {
  name: string
  subtitle: string
  bg_gradient: string
  primary_color: string
  accent_color: string
}

export default function NewThemePage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    name: '',
    subtitle: 'Plataforma de Gamificação Comercial',
    bg_gradient: 'linear-gradient(145deg, #0a1a0e 0%, #0d2a14 50%, #071409 100%)',
    primary_color: '#8DB23C',
    accent_color: '#FFDF00',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Erro ao criar tema')
      setSaving(false)
      return
    }
    router.push('/manager/themes')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>
        Novo tema
      </h1>
      <ThemeForm form={form} setForm={setForm} onSubmit={handleSubmit} saving={saving} error={error} submitLabel="Criar tema" />
    </div>
  )
}

export function ThemeForm({
  form,
  setForm,
  onSubmit,
  saving,
  error,
  submitLabel,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  error: string
  submitLabel: string
}) {
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
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Nome do tema</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Missão Hexa" style={inputStyle} />
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
            <input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} placeholder="#8DB23C" style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Cor de destaque</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
            <input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} placeholder="#FFDF00" style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
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
        {saving ? 'Salvando...' : submitLabel}
      </button>
    </form>
  )
}
