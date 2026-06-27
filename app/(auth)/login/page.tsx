'use client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const supabase = createClient()

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'scmidia.com.br' },
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-black">
      <Card className="w-full max-w-sm border-yellow-500/20 bg-black/80 text-white">
        <CardHeader className="text-center space-y-2">
          <div className="text-5xl">🏆</div>
          <CardTitle className="text-2xl font-bold text-yellow-400">Missão Hexa</CardTitle>
          <p className="text-sm text-gray-400">SCMídia — Gamificação Comercial</p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoogleLogin}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
            Entrar com Google @scmidia.com.br
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
