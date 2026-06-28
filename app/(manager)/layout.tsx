import Image from 'next/image'
import { requireRole } from '@/lib/auth/helpers'
import { ManagerNav } from '@/components/shared/ManagerNav'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requireRole('manager')
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 flex flex-col shrink-0" style={{ backgroundColor: '#3F3E3E' }}>
        {/* Logo */}
        <div className="p-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Image
            src="/logo-scmidia.png"
            alt="SCMídia"
            width={110}
            height={34}
            className="object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <p className="text-xs mt-2 font-medium" style={{ color: '#8DB23C', fontFamily: 'var(--font-outfit, sans-serif)' }}>
            Painel do Gestor
          </p>
        </div>

        <ManagerNav />

        {/* Footer */}
        <div
          className="px-4 py-3"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-outfit, sans-serif)',
          }}
        >
          scmidia.com.br
        </div>
      </aside>

      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#F5F5F3' }}>
        {children}
      </main>
    </div>
  )
}
