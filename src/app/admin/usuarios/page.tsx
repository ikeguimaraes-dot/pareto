import { createClient } from '@/lib/supabase/server'
import UsuariosCliente from './usuarios-cliente'

export default async function UsuariosPage() {
  const supabase = await createClient()

  const [{ data: usuarios }, { data: areas }] = await Promise.all([
    supabase.from('profiles').select('*, areas(nome)').order('nome'),
    supabase.from('areas').select('*').eq('ativo', true).order('nome'),
  ])

  return <UsuariosCliente usuarios={usuarios ?? []} areas={areas ?? []} />
}
