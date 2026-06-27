import { requireRole } from '@/lib/auth/helpers'
import { UserForm } from '@/components/users/UserForm'

export default async function NewUserPage() {
  await requireRole('manager')
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Novo Usuário</h1>
      <UserForm />
    </div>
  )
}
