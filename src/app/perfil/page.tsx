import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PerfilCliente from './perfil-cliente'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, areas(nome)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return <PerfilCliente profile={profile} />
}
