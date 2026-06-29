'use client'
import { createClient } from '@/lib/supabase/client'

export function GoogleLoginButton({ primaryColor }: { primaryColor: string }) {
  const supabase = createClient()

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'scmidia.com.br' },
      },
    })
  }

  return (
    <button
      onClick={handleLogin}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
        padding: '0.75rem 1.25rem', cursor: 'pointer',
        background: primaryColor, color: '#ffffff',
        fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.9rem',
        border: 'none', borderRadius: '0 0.75rem 0.75rem 0.75rem',
        transition: 'filter 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.88)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#fff" fillOpacity=".9"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#fff" fillOpacity=".8"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#fff" fillOpacity=".7"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#fff" fillOpacity=".6"/>
      </svg>
      Entrar com Google @scmidia.com.br
    </button>
  )
}
