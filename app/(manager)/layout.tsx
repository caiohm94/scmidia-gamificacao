import { requireRole } from '@/lib/auth/helpers'
import { ManagerShell } from '@/components/shared/ManagerShell'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requireRole('manager')
  return <ManagerShell>{children}</ManagerShell>
}
