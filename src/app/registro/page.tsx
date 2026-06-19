import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RegistroCliente from './registro-cliente'

export default async function RegistroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: categorias },
    { data: projetos },
    { data: areas },
  ] = await Promise.all([
    supabase.from('profiles').select('*, areas(nome)').eq('id', user.id).single(),
    supabase.from('categorias_atividade').select('*').order('nome'),
    supabase.from('projetos').select('*').eq('ativo', true).order('nome'),
    supabase.from('areas').select('*').eq('ativo', true).order('nome'),
  ])

  if (!profile) redirect('/login')

  return (
    <RegistroCliente
      profile={profile}
      categorias={categorias ?? []}
      projetos={projetos ?? []}
      areas={areas ?? []}
    />
  )
}
