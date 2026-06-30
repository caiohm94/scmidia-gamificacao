'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userSchema, type UserInput } from '@/schemas/user'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const functionLabels: Record<string, string> = {
  internal_seller: 'Vendedor Interno',
  external_seller: 'Vendedor Externo',
  hunter: 'Hunter',
  manager: 'Gestor',
  auditor: 'Auditor',
}
const roleLabels: Record<string, string> = { manager: 'Gestor', participant: 'Participante' }
const statusLabels: Record<string, string> = { active: 'Ativo', inactive: 'Inativo' }

interface Props {
  defaultValues?: Partial<UserInput>
  userId?: string
  teams?: { id: string; name: string; color: string }[]
}

type SFStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error'

export function UserForm({ defaultValues, userId, teams = [] }: Props) {
  const router = useRouter()
  const [funcVal, setFuncVal] = useState(defaultValues?.function ?? 'internal_seller')
  const [roleVal, setRoleVal] = useState(defaultValues?.role ?? 'participant')
  const [statusVal, setStatusVal] = useState(defaultValues?.status ?? 'active')
  const [teamVal, setTeamVal] = useState(defaultValues?.team_id ?? '')
  const [sfAlias, setSfAlias] = useState(defaultValues?.sf_alias ?? '')
  const [avatarUrl, setAvatarUrl] = useState(defaultValues?.avatar_url ?? '')
  const [sfStatus, setSfStatus] = useState<SFStatus>('idle')

  const { register, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } =
    useForm<UserInput>({
      resolver: zodResolver(userSchema),
      defaultValues: { status: 'active', team_id: null, role: 'participant', function: 'internal_seller', ...defaultValues },
    })

  async function lookupSFAlias(email?: string) {
    const target = email ?? getValues('email')
    if (!target) return
    setSfStatus('loading')
    try {
      const res = await fetch(`/api/integrations/salesforce/lookup-alias?email=${encodeURIComponent(target)}`)
      const data = await res.json() as { alias: string | null; found: boolean; error?: string }
      if (data.found && data.alias) {
        setSfAlias(data.alias)
        setValue('sf_alias', data.alias)
        setSfStatus('found')
      } else {
        setSfStatus('not_found')
      }
    } catch {
      setSfStatus('error')
    }
  }

  async function onSubmit(values: UserInput) {
    const url = userId ? `/api/users/${userId}` : '/api/users'
    const method = userId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erro ao salvar usuário')
      return
    }
    toast.success(userId ? 'Usuário atualizado!' : 'Usuário criado!')
    router.push('/manager/users')
    router.refresh()
  }

  const labelStyle = { fontSize: '0.8rem', fontWeight: 500, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)', display: 'block', marginBottom: '0.35rem' } as const
  const inputStyle = { width: '100%', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#3F3E3E', outline: 'none', background: '#fff', fontFamily: 'inherit' } as const
  const selectStyle = { ...inputStyle, cursor: 'pointer' }
  const errorStyle = { fontSize: '0.72rem', color: '#c0622a', marginTop: '0.25rem' } as const

  const sfStatusIcon = {
    loading:   <Loader2 size={14} style={{ color: 'rgba(63,62,62,0.4)', animation: 'spin 1s linear infinite' }} />,
    found:     <CheckCircle2 size={14} style={{ color: '#5C7435' }} />,
    not_found: <XCircle size={14} style={{ color: '#c0622a' }} />,
    error:     <XCircle size={14} style={{ color: '#c0622a' }} />,
    idle:      null,
  }[sfStatus]

  const sfStatusText = {
    loading:   'Buscando no Salesforce…',
    found:     'Alias encontrado!',
    not_found: 'Não encontrado no Salesforce',
    error:     'Erro ao conectar ao Salesforce',
    idle:      null,
  }[sfStatus]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label style={labelStyle}>Nome *</label>
        <input {...register('name')} style={inputStyle} placeholder="Nome completo" />
        {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
      </div>

      <div>
        <label style={labelStyle}>E-mail *</label>
        <input
          {...register('email')}
          type="email"
          style={inputStyle}
          placeholder="nome@scmidia.com.br"
          // On new user: auto-lookup SF alias when email is filled
          onBlur={e => { if (!userId && e.target.value) lookupSFAlias(e.target.value) }}
        />
        {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Função *</label>
          <select
            value={funcVal}
            onChange={e => { setFuncVal(e.target.value as UserInput['function']); setValue('function', e.target.value as UserInput['function']) }}
            style={selectStyle}
          >
            <option value="internal_seller">Vendedor Interno</option>
            <option value="external_seller">Vendedor Externo</option>
            <option value="hunter">Hunter</option>
            <option value="manager">Gestor</option>
            <option value="auditor">Auditor</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Perfil *</label>
          <select
            value={roleVal}
            onChange={e => { setRoleVal(e.target.value as UserInput['role']); setValue('role', e.target.value as UserInput['role']) }}
            style={selectStyle}
          >
            <option value="participant">Participante</option>
            <option value="manager">Gestor</option>
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Status *</label>
        <select
          value={statusVal}
          onChange={e => { setStatusVal(e.target.value as UserInput['status']); setValue('status', e.target.value as UserInput['status']) }}
          style={selectStyle}
        >
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>

      <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(63,62,62,0.1)' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(63,62,62,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Integração Salesforce
        </p>

        <div>
          <label style={labelStyle}>Alias no Salesforce</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              value={sfAlias}
              onChange={e => { setSfAlias(e.target.value); setValue('sf_alias', e.target.value || null); setSfStatus('idle') }}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="jsmith"
            />
            <button
              type="button"
              onClick={() => lookupSFAlias()}
              disabled={sfStatus === 'loading'}
              title="Buscar alias pelo e-mail no Salesforce"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.5rem 0.85rem', fontSize: '0.78rem', fontWeight: 600,
                borderRadius: '0 0.4rem 0.4rem 0.4rem', flexShrink: 0,
                border: '1px solid rgba(141,178,60,0.4)',
                background: sfStatus === 'loading' ? 'rgba(63,62,62,0.05)' : 'rgba(141,178,60,0.07)',
                color: sfStatus === 'loading' ? 'rgba(63,62,62,0.4)' : '#5C7435',
                cursor: sfStatus === 'loading' ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-outfit, sans-serif)',
                whiteSpace: 'nowrap',
              }}
            >
              {sfStatus === 'loading'
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <Search size={13} />}
              Buscar no SF
            </button>
          </div>
          {sfStatusText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
              {sfStatusIcon}
              <span style={{ fontSize: '0.72rem', color: sfStatus === 'found' ? '#5C7435' : sfStatus === 'idle' ? 'rgba(63,62,62,0.4)' : '#c0622a' }}>
                {sfStatusText}
              </span>
            </div>
          )}
          {!sfStatusText && (
            <p style={{ fontSize: '0.68rem', color: 'rgba(63,62,62,0.4)', marginTop: '0.2rem' }}>
              {userId ? 'Clique em "Buscar no SF" para preencher automaticamente.' : 'Preenchido automaticamente ao informar o e-mail.'}
            </p>
          )}
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <label style={labelStyle}>URL da foto</label>
          <input
            value={avatarUrl}
            onChange={e => { setAvatarUrl(e.target.value); setValue('avatar_url', e.target.value || null) }}
            style={inputStyle}
            placeholder="https://..."
          />
          <p style={{ fontSize: '0.68rem', color: 'rgba(63,62,62,0.4)', marginTop: '0.2rem' }}>
            Link direto para a foto do participante (HTTPS).
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="sc-btn-primary cursor-pointer"
        style={{ padding: '0.6rem 1.5rem', fontSize: '0.875rem', opacity: isSubmitting ? 0.7 : 1 }}
      >
        {isSubmitting ? 'Salvando...' : userId ? 'Salvar alterações' : 'Criar usuário'}
      </button>
    </form>
  )
}
