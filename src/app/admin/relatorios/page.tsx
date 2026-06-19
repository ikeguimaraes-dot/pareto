import { createClient } from '@/lib/supabase/server'
import RelatoriosCliente from './relatorios-cliente'
import { subDays, startOfDay, format } from 'date-fns'

export default async function RelatoriosPage() {
  const supabase = await createClient()

  const [{ data: areas }, { data: usuarios }, { data: categorias }] = await Promise.all([
    supabase.from('areas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('profiles').select('id, nome, area_id, horas_dia_contratadas').eq('ativo', true).order('nome'),
    supabase.from('categorias_atividade').select('*').order('nome'),
  ])

  const dataFim = new Date()
  const dataInicio = subDays(dataFim, 29)

  const { data: registros } = await supabase
    .from('registros')
    .select('*, profiles(nome, area_id, horas_dia_contratadas), categorias_atividade(nome, cor), projetos(nome), areas(nome)')
    .gte('inicio', startOfDay(dataInicio).toISOString())
    .lte('inicio', dataFim.toISOString())
    .not('fim', 'is', null)
    .order('inicio', { ascending: false })

  return (
    <RelatoriosCliente
      registros={registros ?? []}
      areas={areas ?? []}
      usuarios={usuarios ?? []}
      categorias={categorias ?? []}
      dataInicioDefault={format(dataInicio, 'yyyy-MM-dd')}
      dataFimDefault={format(dataFim, 'yyyy-MM-dd')}
    />
  )
}
