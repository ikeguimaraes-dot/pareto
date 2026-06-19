import { createClient } from '@/lib/supabase/server'
import ProjetosCliente from './projetos-cliente'

export default async function ProjetosPage() {
  const supabase = await createClient()
  const [{ data: projetos }, { data: areas }] = await Promise.all([
    supabase.from('projetos').select('*, areas(nome)').order('nome'),
    supabase.from('areas').select('*').eq('ativo', true).order('nome'),
  ])

  return <ProjetosCliente projetos={projetos ?? []} areas={areas ?? []} />
}
