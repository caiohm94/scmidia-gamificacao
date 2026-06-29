'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userSchema, type UserInput } from '@/schemas/user'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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

export function UserForm({ defaultValues, userId, teams = [] }: Props) {
  const router = useRouter()
  const [funcVal, setFuncVal] = useState(defaultValues?.function ?? 'internal_seller')
  const [roleVal, setRoleVal] = useState(defaultValues?.role ?? 'participant')
  const [statusVal, setStatusVal] = useState(defaultValues?.status ?? 'active')
  const [teamVal, setTeamVal] = useState(defaultValues?.team_id ?? '')
  const [sfAlias, setSfAlias] = useState(defaultValues?.sf_alias ?? '')

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<UserInput>({
      resolver: zodResolver(userSchema),
      defaultValues: { status: 'active', team_id: null, role: 'participant', function: 'internal_seller', ...defaultValues },
    })

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label style={labelStyle}>Nome *</label>
        <input {...register('name')} style={inputStyle} placeholder="Nome completo" />
        {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
      </div>

      <div>
        <label style={labelStyle}>E-mail *</label>
        <input {...register('email')} type="email" style={inputStyle} placeholder="nome@scmidia.com.br" />
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
          <input
            value={sfAlias}
            onChange={e => { setSfAlias(e.target.value); setValue('sf_alias', e.target.value || null) }}
            style={inputStyle}
            placeholder="jsmith"
          />
          <p style={{ fontSize: '0.68rem', color: 'rgba(63,62,62,0.4)', marginTop: '0.2rem' }}>
            Alias exato do usuário no Salesforce. Usado para mapear resultados da SOQL.
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
