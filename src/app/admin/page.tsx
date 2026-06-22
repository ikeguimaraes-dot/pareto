import { createClient } from '@/lib/supabase/server'
import { computePainel, PERIODOS, type PeriodoId } from '@/lib/painel'
import PainelCliente from './painel-cliente'

// O painel reflete sempre o estado atual dos dados.
export const dynamic = 'force-dynamic'

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; area?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const [
    { data: registros },
    { data: pontuacoes },
    { data: profiles },
    { data: areas },
    { data: categorias },
  ] = await Promise.all([
    supabase.from('registros').select('user_id, area_id, categoria_id, inicio, fim').order('inicio', { ascending: false }).limit(5000),
    supabase.from('pontuacao_diaria').select('user_id, data, percentual, bateu_meta, moedas_delta').limit(5000),
    supabase.from('profiles').select('id, nome, sobrenome, role, area_id, cargo, horas_dia_contratadas, ativo, moedas'),
    supabase.from('areas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('categorias_atividade').select('id, nome, cor').order('nome'),
  ])

  const periodo: PeriodoId = PERIODOS.some(p => p.id === sp.periodo) ? (sp.periodo as PeriodoId) : '7d'
  const areaValida = (areas ?? []).some(a => a.id === sp.area) ? sp.area! : null

  const data = computePainel(
    {
      registros: registros ?? [],
      pontuacoes: pontuacoes ?? [],
      profiles: profiles ?? [],
      areas: areas ?? [],
      categorias: categorias ?? [],
    },
    { periodo, areaId: areaValida, agoraISO: new Date().toISOString() },
  )

  return <PainelCliente data={data} />
}
