import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Landing from './landing'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logado: vai para a área por papel (mesma regra do proxy). Deslogado: landing.
  // Deslogado NUNCA é redirecionado para /login aqui — só pelo clique em "Entrar".
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') redirect('/admin')
    redirect('/registro')
  }

  return <Landing />
}
