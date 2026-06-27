'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userSchema, type UserInput } from '@/schemas/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props { defaultValues?: Partial<UserInput>; userId?: string }

export function UserForm({ defaultValues, userId }: Props) {
  const router = useRouter()
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<UserInput>({
      resolver: zodResolver(userSchema),
      defaultValues: { status: 'active', team_id: null, ...defaultValues },
    })

  async function onSubmit(values: UserInput) {
    const url = userId ? `/api/users/${userId}` : '/api/users'
    const method = userId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) { toast.error('Erro ao salvar usuário'); return }
    toast.success(userId ? 'Usuário atualizado!' : 'Usuário criado!')
    router.push('/manager/users')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label>Nome</Label>
        <Input {...register('name')} placeholder="Nome completo" />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>E-mail</Label>
        <Input {...register('email')} type="email" placeholder="nome@scmidia.com.br" />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Função</Label>
        <Select
          onValueChange={v => setValue('function', v as UserInput['function'])}
          defaultValue={defaultValues?.function}
        >
          <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="internal_seller">Vendedor Interno</SelectItem>
            <SelectItem value="external_seller">Vendedor Externo</SelectItem>
            <SelectItem value="hunter">Hunter</SelectItem>
            <SelectItem value="manager">Gestor</SelectItem>
            <SelectItem value="auditor">Auditor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Perfil</Label>
        <Select
          onValueChange={v => setValue('role', v as UserInput['role'])}
          defaultValue={defaultValues?.role ?? 'participant'}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">Gestor</SelectItem>
            <SelectItem value="participant">Participante</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select
          onValueChange={v => setValue('status', v as UserInput['status'])}
          defaultValue={defaultValues?.status ?? 'active'}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : userId ? 'Salvar alterações' : 'Criar usuário'}
      </Button>
    </form>
  )
}
