import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Avatar } from '@/components/shared/Avatar'
import Image from 'next/image'
import Link from 'next/link'
import { ParticipantNav } from '@/components/shared/ParticipantNav'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { ThemeWrapper } from '@/components/participant/ThemeToggle'

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  await requireRole('participant')
  const user = await getSessionUser()

  const headerContent = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/participant/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <Image src="/logo-scmidia.png" alt="SCMídia" width={72} height={22} className="object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>|</span>
          <span style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 700, fontSize: '0.9rem', color: '#FFDF00', letterSpacing: '-0.01em' }}>Missão Hexa</span>
        </Link>
      </div>
      <ParticipantNav />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <NotificationBell />
        <Avatar src={user?.avatar_url} name={user?.name ?? ''} size={30} />
        <SignOutButton />
      </div>
    </>
  )

  return (
    <ThemeWrapper headerContent={headerContent}>
      {children}
    </ThemeWrapper>
  )
}
