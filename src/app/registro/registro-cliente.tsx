'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInSeconds, parseISO, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Profile, CategoriaAtividade, Projeto, Area, RegistroComRelacoes } from '@/types/database'
import {
  calcularEstatisticas,
  ultimosDiasUteis,
  nivelDe,
  MOEDAS_BASE,
  MOEDAS_BONUS_DIA,
  MOEDAS_BONUS_MAX,
  META_PCT,
  NIVEIS,
} from '@/lib/gamificacao'

interface Props {
  profile: Profile & { areas?: { nome: string } | null }
  categorias: CategoriaAtividade[]
  projetos: Projeto[]
  areas: Area[]
}

// Aviso de bloco rodando há muito tempo (provável esquecimento)
const AVISO_SEGUNDOS = 4 * 3600

function formatarDuracao(segundos: number): string {
  const s = Math.max(0, segundos)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`
  return `${m}min`
}

function formatarDuracaoCurta(segundos: number): string {
  const s = Math.max(0, segundos)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`
  return `${m}min`
}

function formatarRelogio(segundos: number): string {
  const s = Math.max(0, segundos)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = m.toString().padStart(2, '0')
  const ss = sec.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function calcularDuracao(inicio: string, fim: string | null): number {
  const fimDate = fim ? parseISO(fim) : new Date()
  return differenceInSeconds(fimDate, parseISO(inicio))
}

// ── Anel de progresso (SVG, sem dependências) ──────────────
function AnelProgresso({
  pct,
  cor,
  completo,
  children,
  size = 168,
  stroke = 14,
}: {
  pct: number
  cor: string
  completo: boolean
  children: React.ReactNode
  size?: number
  stroke?: number
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(pct, 1))
  const offset = c * (1 - p)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={completo ? '#16a34a' : cor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}

export default function RegistroCliente({ profile, categorias, projetos, areas }: Props) {
  const supabase = createClient()

  const [registrosHoje, setRegistrosHoje] = useState<RegistroComRelacoes[]>([])
  const [historico, setHistorico] = useState<{ inicio: string; fim: string | null }[]>([])
  const [blocoAtivo, setBlocoAtivo] = useState<RegistroComRelacoes | null>(null)
  const [cronometro, setCronometro] = useState(0)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalEditar, setModalEditar] = useState<RegistroComRelacoes | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmacaoFim, setConfirmacaoFim] = useState('')
  const [celebrar, setCelebrar] = useState(false)
  const [mostrarRegras, setMostrarRegras] = useState(false)
  // Saldo autoritativo (profiles.moedas). Nunca recalculado no cliente.
  const [moedasReais, setMoedasReais] = useState<number>(profile.moedas ?? 0)

  // Form do modal
  const [formCategoria, setFormCategoria] = useState('')
  const [formProjeto, setFormProjeto] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formParticipantes, setFormParticipantes] = useState('')
  const [formInicio, setFormInicio] = useState('')
  const [formFim, setFormFim] = useState('')
  const [formArea, setFormArea] = useState(profile.area_id ?? '')

  const cardAtivoRef = useRef<HTMLDivElement | null>(null)
  const [cardAtivoVisivel, setCardAtivoVisivel] = useState(true)

  const carregarRegistros = useCallback(async () => {
    const hoje = new Date()
    const inicioHoje = startOfDay(hoje).toISOString()
    const fimHoje = endOfDay(hoje).toISOString()

    const { data } = await supabase
      .from('registros')
      .select('*, categorias_atividade(*), projetos(*), areas(*)')
      .eq('user_id', profile.id)
      .gte('inicio', inicioHoje)
      .lte('inicio', fimHoje)
      .order('inicio', { ascending: true })

    setRegistrosHoje(data ?? [])
    const ativo = data?.find(r => !r.fim) ?? null
    setBlocoAtivo(ativo)
    if (ativo) setCronometro(calcularDuracao(ativo.inicio, null))
  }, [supabase, profile.id])

  const carregarHistorico = useCallback(async () => {
    const { data } = await supabase
      .from('registros')
      .select('inicio, fim')
      .eq('user_id', profile.id)
      .order('inicio', { ascending: true })
    setHistorico(data ?? [])
  }, [supabase, profile.id])

  const recarregar = useCallback(async () => {
    await Promise.all([carregarRegistros(), carregarHistorico()])
  }, [carregarRegistros, carregarHistorico])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  // Ao abrir a área do colaborador: processa a pontuação no banco (idempotente)
  // e relê o saldo de moedas para exibir. A pontuação nunca é calculada aqui.
  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        await supabase.rpc('processar_pontuacao_diaria')
      } catch {
        // mantém o último saldo conhecido se a função falhar
      }
      const { data } = await supabase.from('profiles').select('moedas').eq('id', profile.id).single()
      if (ativo && typeof data?.moedas === 'number') setMoedasReais(data.moedas)
    })()
    return () => {
      ativo = false
    }
  }, [supabase, profile.id])

  // Cronômetro do bloco ativo
  useEffect(() => {
    if (!blocoAtivo) return
    const interval = setInterval(() => {
      setCronometro(calcularDuracao(blocoAtivo.inicio, null))
    }, 1000)
    return () => clearInterval(interval)
  }, [blocoAtivo])

  // Estatísticas de gamificação (recalcula ao vivo enquanto há bloco ativo)
  const estatisticas = useMemo(
    () => calcularEstatisticas(historico, profile.horas_dia_contratadas || 8, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historico, cronometro, blocoAtivo],
  )

  // Título da aba vira cronômetro — lembra de encerrar mesmo em outra aba
  useEffect(() => {
    if (blocoAtivo) {
      document.title = `⏱ ${formatarRelogio(cronometro)} · ${blocoAtivo.descricao}`
    } else {
      document.title = 'Pareto'
    }
    return () => {
      document.title = 'Pareto'
    }
  }, [blocoAtivo, cronometro])

  // Barra flutuante só aparece quando o card ativo sai da tela
  useEffect(() => {
    if (!blocoAtivo) {
      setCardAtivoVisivel(true)
      return
    }
    const el = cardAtivoRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setCardAtivoVisivel(entry.isIntersecting), {
      threshold: 0.15,
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [blocoAtivo])

  // Celebração ao bater a meta (não dispara no primeiro carregamento)
  const bateuRef = useRef(false)
  const primeiraRef = useRef(true)
  useEffect(() => {
    if (!historico.length) return
    if (primeiraRef.current) {
      primeiraRef.current = false
      bateuRef.current = estatisticas.hojeBateuMeta
      return
    }
    if (estatisticas.hojeBateuMeta && !bateuRef.current) {
      setCelebrar(true)
      const t = setTimeout(() => setCelebrar(false), 7000)
      bateuRef.current = true
      return () => clearTimeout(t)
    }
    bateuRef.current = estatisticas.hojeBateuMeta
  }, [estatisticas.hojeBateuMeta, historico.length])

  function abrirModalNovo() {
    setFormCategoria('')
    setFormProjeto('')
    setFormDescricao('')
    setFormParticipantes('')
    setFormInicio(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
    setFormFim('')
    setFormArea(profile.area_id ?? '')
    setErro('')
    setModalAberto(true)
  }

  function abrirModalEditar(registro: RegistroComRelacoes) {
    setFormCategoria(registro.categoria_id)
    setFormProjeto(registro.projeto_id ?? '')
    setFormDescricao(registro.descricao)
    setFormParticipantes(registro.participantes ?? '')
    setFormInicio(format(parseISO(registro.inicio), "yyyy-MM-dd'T'HH:mm"))
    setFormFim(registro.fim ? format(parseISO(registro.fim), "yyyy-MM-dd'T'HH:mm") : '')
    setFormArea(registro.area_id ?? profile.area_id ?? '')
    setErro('')
    setModalEditar(registro)
  }

  async function encerrarBloco(id: string) {
    const { error } = await supabase
      .from('registros')
      .update({ fim: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(`Erro ao encerrar bloco: ${error.message}`)
  }

  async function salvarRegistro(e: React.FormEvent) {
    e.preventDefault()
    if (!formCategoria || !formDescricao.trim()) {
      setErro('Categoria e descrição são obrigatórios.')
      return
    }
    setCarregando(true)
    setErro('')

    try {
      if (modalEditar) {
        const { error } = await supabase.from('registros').update({
          categoria_id: formCategoria,
          projeto_id: formProjeto || null,
          descricao: formDescricao.trim(),
          participantes: formParticipantes.trim() || null,
          area_id: formArea || null,
          inicio: new Date(formInicio).toISOString(),
          fim: formFim ? new Date(formFim).toISOString() : null,
        }).eq('id', modalEditar.id)
        if (error) throw error
        setModalEditar(null)
      } else {
        if (blocoAtivo) await encerrarBloco(blocoAtivo.id)

        const { error } = await supabase.from('registros').insert({
          user_id: profile.id,
          categoria_id: formCategoria,
          projeto_id: formProjeto || null,
          descricao: formDescricao.trim(),
          participantes: formParticipantes.trim() || null,
          area_id: formArea || null,
          inicio: new Date(formInicio).toISOString(),
          fim: null,
        })
        if (error) throw error
        setModalAberto(false)
      }

      await recarregar()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setErro(message.includes('idx_registros_ativo')
        ? 'Já existe um bloco ativo. Encerre-o antes de iniciar outro.'
        : 'Erro ao salvar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function encerrarAtual() {
    if (!blocoAtivo) return
    try {
      await encerrarBloco(blocoAtivo.id)
      await recarregar()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao encerrar atividade.')
    }
  }

  async function fimDoExpediente() {
    setErro('')
    setConfirmacaoFim('')

    const catId = categorias.find(c => c.nome.toLowerCase().includes('pausa'))?.id ?? categorias[0]?.id
    if (!catId) {
      setErro('Nenhuma categoria disponível. Cadastre ao menos uma categoria.')
      return
    }

    try {
      if (blocoAtivo) await encerrarBloco(blocoAtivo.id)

      const agora = new Date()
      const inicioHoje = startOfDay(agora).toISOString()
      const fimHoje = endOfDay(agora).toISOString()
      const { data: registrosDia } = await supabase
        .from('registros')
        .select('descricao, fim')
        .eq('user_id', profile.id)
        .gte('inicio', inicioHoje)
        .lte('inicio', fimHoje)
        .order('inicio', { ascending: false })
        .limit(1)

      const ultimoRegistro = registrosDia?.[0]
      const jaTemMarcador =
        !blocoAtivo &&
        ultimoRegistro?.descricao === 'Fim do expediente' &&
        ultimoRegistro?.fim !== null

      if (!jaTemMarcador) {
        const agoraIso = agora.toISOString()
        const { error } = await supabase.from('registros').insert({
          user_id: profile.id,
          categoria_id: catId,
          descricao: 'Fim do expediente',
          area_id: profile.area_id,
          inicio: agoraIso,
          fim: agoraIso,
        })
        if (error) throw new Error(error.message)
      }

      await recarregar()
      setConfirmacaoFim(`Expediente encerrado às ${format(agora, 'HH:mm')}`)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao encerrar expediente.')
    }
  }

  async function encerrarEIniciarProxima() {
    try {
      if (blocoAtivo) await encerrarBloco(blocoAtivo.id)
      await recarregar()
      abrirModalNovo()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao encerrar atividade.')
    }
  }

  async function atalhoRapido(descricao: string, categoriaId?: string) {
    const catId = categoriaId ?? categorias.find(c => c.nome.includes('Pausa'))?.id ?? categorias[0]?.id
    if (!catId) {
      setErro('Nenhuma categoria disponível. Cadastre ao menos uma categoria.')
      return
    }
    try {
      if (blocoAtivo) await encerrarBloco(blocoAtivo.id)
      const { error } = await supabase.from('registros').insert({
        user_id: profile.id,
        categoria_id: catId,
        descricao,
        area_id: profile.area_id,
        inicio: new Date().toISOString(),
      })
      if (error) throw new Error(error.message)
      await recarregar()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao registrar atalho.')
    }
  }

  const totalSegundos = registrosHoje.reduce((acc, r) => acc + calcularDuracao(r.inicio, r.fim), 0)

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const mostrarForm = modalAberto || modalEditar !== null
  const perfilIncompleto = !profile.cargo || !profile.sobrenome || !profile.data_nascimento

  // Aviso: bloco rodando há muito tempo ou virou o dia
  const blocoLongo = blocoAtivo
    ? cronometro >= AVISO_SEGUNDOS ||
      format(parseISO(blocoAtivo.inicio), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')
    : false

  const { hojeSegundos, meta, hojeBateuMeta, hojePct, streakAtual } = estatisticas
  // Saldo e nível vêm do banco (moedasReais), não do cálculo local.
  const totalMoedas = moedasReais
  const { nivel, proximoNivel, faltaProxNivel, progressoNivel } = nivelDe(totalMoedas)
  const primeiroNome = profile.nome.split(' ')[0]
  const diasTrilha = ultimosDiasUteis(7, new Date())

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl font-bold text-indigo-600">Pareto</span>
          <button
            onClick={() => setMostrarRegras(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white pl-2 pr-2.5 py-1 rounded-full text-sm font-bold shadow-sm hover:from-amber-500 hover:to-amber-600 transition-colors"
            title="Como funcionam as moedas"
          >
            <span className="text-base leading-none">🪙</span>
            <span className="tabular-nums">{totalMoedas}</span>
          </button>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${nivel.corBg} ${nivel.cor}`}>
            <span>{nivel.emoji}</span>
            <span className="hidden sm:inline">{nivel.nome}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/perfil" className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors font-medium">
            Perfil
          </Link>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Sair
          </button>
        </div>
      </header>

      <main className={`max-w-2xl mx-auto px-4 py-6 space-y-5 ${blocoAtivo && !cardAtivoVisivel ? 'pb-28' : ''}`}>
        {/* Saudação + nudge */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Olá, {primeiroNome} 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        {perfilIncompleto && (
          <Link
            href="/perfil"
            className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 hover:bg-amber-100 transition-colors"
          >
            <span className="text-sm text-amber-700">Complete seu perfil para a equipe te conhecer melhor.</span>
            <span className="text-sm font-semibold text-amber-700 flex-shrink-0">Completar →</span>
          </Link>
        )}

        {/* Card-herói: progresso do dia + gamificação */}
        <section className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <AnelProgresso pct={hojePct} cor={nivel.corRing} completo={hojeBateuMeta}>
              {hojeBateuMeta ? (
                <>
                  <span className="text-3xl">🎯</span>
                  <span className="text-xs font-semibold text-green-600 mt-0.5">Meta batida!</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-gray-900 tabular-nums">
                    {Math.round(hojePct * 100)}%
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">da meta</span>
                </>
              )}
              <span className="text-xs text-gray-500 mt-1 font-medium tabular-nums">
                {formatarDuracaoCurta(hojeSegundos)} / {formatarDuracaoCurta(meta)}
              </span>
            </AnelProgresso>

            <div className="flex-1 w-full space-y-3">
              <div>
                <p className="text-sm text-gray-500">
                  {hojeBateuMeta
                    ? 'Você cumpriu sua meta de documentação hoje. 🎉'
                    : `Faltam ${formatarDuracao(Math.max(0, meta - hojeSegundos))} para bater a meta de hoje.`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-orange-50 rounded-2xl px-3 py-2.5">
                  <div className="flex items-center gap-1 text-orange-600">
                    <span className="text-base">🔥</span>
                    <span className="text-lg font-bold tabular-nums">{streakAtual}</span>
                  </div>
                  <p className="text-xs text-orange-700/70 mt-0.5">
                    {streakAtual === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-2xl px-3 py-2.5">
                  <div className="flex items-center gap-1 text-amber-600">
                    <span className="text-base">🪙</span>
                    <span className="text-lg font-bold tabular-nums">
                      {hojeBateuMeta ? `+${estatisticas.moedasHoje}` : `+${estatisticas.moedasHojePotencial}`}
                    </span>
                  </div>
                  <p className="text-xs text-amber-700/70 mt-0.5">
                    {hojeBateuMeta ? 'ganhas hoje' : 'ao bater a meta'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trilha dos últimos 7 dias úteis */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              {diasTrilha.map(d => {
                const chave = format(d, 'yyyy-MM-dd')
                const resumo = estatisticas.mapaDias.get(chave)
                const bateu = resumo?.bateuMeta ?? false
                const ehHoje = chave === format(new Date(), 'yyyy-MM-dd')
                return (
                  <div key={chave} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                        bateu
                          ? 'bg-green-500 text-white'
                          : ehHoje
                          ? 'bg-white border-2 border-dashed border-indigo-300'
                          : 'bg-gray-100 text-gray-300'
                      } ${ehHoje ? 'ring-2 ring-indigo-200 ring-offset-1' : ''}`}
                    >
                      {bateu ? '✓' : ''}
                    </div>
                    <span className={`text-[10px] capitalize ${ehHoje ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                      {format(d, 'EEEEEE', { locale: ptBR })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Celebração */}
        {celebrar && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-md animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-bold">Meta do dia conquistada!</p>
                <p className="text-sm text-green-50">+{estatisticas.moedasHoje} moedas · ofensiva de {streakAtual} {streakAtual === 1 ? 'dia' : 'dias'}</p>
              </div>
            </div>
            <button onClick={() => setCelebrar(false)} className="text-green-100 hover:text-white text-xl leading-none">&times;</button>
          </div>
        )}

        {/* Bloco ativo OU iniciar */}
        {blocoAtivo ? (
          <div
            ref={cardAtivoRef}
            className={`text-white rounded-3xl p-5 shadow-md ${
              blocoLongo ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-indigo-600 to-violet-600'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-white/80 uppercase tracking-wide">Em andamento</span>
                </div>
                <p className="font-semibold text-lg leading-tight">{blocoAtivo.descricao}</p>
                {blocoAtivo.participantes && (
                  <p className="text-sm text-white/70 mt-0.5">com {blocoAtivo.participantes}</p>
                )}
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <div className="text-3xl font-mono font-bold tabular-nums">{formatarRelogio(cronometro)}</div>
                {blocoAtivo.categorias_atividade && (
                  <span className="text-xs text-white/70">{blocoAtivo.categorias_atividade.nome}</span>
                )}
              </div>
            </div>

            {blocoLongo && (
              <div className="bg-white/15 rounded-xl px-3 py-2 mb-3 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>Esse bloco já roda há bastante tempo. Esqueceu de encerrar?</span>
              </div>
            )}

            <div className="flex gap-2 mt-1">
              <button
                onClick={encerrarEIniciarProxima}
                className="flex-1 bg-white text-indigo-700 py-2.5 px-3 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors"
              >
                Encerrar e iniciar próxima
              </button>
              <button
                onClick={encerrarAtual}
                className="bg-white/20 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
              >
                Só encerrar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={abrirModalNovo}
            className="w-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-3xl p-6 text-center hover:from-indigo-700 hover:to-violet-700 transition-colors shadow-sm"
          >
            <div className="text-3xl mb-1">＋</div>
            <div className="font-semibold text-lg">Iniciar atividade</div>
            <div className="text-sm text-white/70">Registre o que você está fazendo agora</div>
          </button>
        )}

        {/* Atalhos rápidos */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => atalhoRapido('Chegada / início do expediente')}
            className="bg-white border border-gray-200 rounded-xl py-3 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>☀️</span> Cheguei
          </button>
          <button
            onClick={() => atalhoRapido('Saída para almoço')}
            className="bg-white border border-gray-200 rounded-xl py-3 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>🍽️</span> Almoço
          </button>
          <button
            onClick={fimDoExpediente}
            className="bg-white border border-gray-200 rounded-xl py-3 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>🌙</span> Fim do expediente
          </button>
          <button
            onClick={abrirModalNovo}
            className="bg-white border border-gray-200 rounded-xl py-3 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>➕</span> Novo bloco
          </button>
        </div>

        {/* Confirmação de fim de expediente */}
        {confirmacaoFim && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <span className="text-lg">✓</span>
              <span className="text-sm font-medium">{confirmacaoFim}</span>
            </div>
            <button onClick={() => setConfirmacaoFim('')} className="text-green-400 hover:text-green-600 text-lg leading-none">&times;</button>
          </div>
        )}

        {erro && !mostrarForm && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>
        )}

        {/* Linha do tempo do dia */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Hoje</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {registrosHoje.length} registro{registrosHoje.length !== 1 ? 's' : ''} · {formatarDuracao(totalSegundos)} registradas
              </p>
            </div>
          </div>

          {registrosHoje.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              Nenhuma atividade registrada hoje ainda.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {registrosHoje.map((registro) => {
                const dur = calcularDuracao(registro.inicio, registro.fim)
                const cat = registro.categorias_atividade
                return (
                  <div key={registro.id} className="px-5 py-3 hover:bg-gray-50 flex items-start gap-3 group">
                    <div className="flex-shrink-0 w-3 h-3 rounded-full mt-1.5" style={{ backgroundColor: cat?.cor ?? '#6B7280' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{registro.descricao}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span>{format(parseISO(registro.inicio), 'HH:mm')} → {registro.fim ? format(parseISO(registro.fim), 'HH:mm') : 'agora'}</span>
                        <span>·</span>
                        <span>{cat?.nome}</span>
                        {registro.projetos && (
                          <>
                            <span>·</span>
                            <span className="truncate">{registro.projetos.nome}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        {formatarDuracao(dur)}
                      </span>
                      {registro.fim && (
                        <button
                          onClick={() => abrirModalEditar(registro)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-indigo-500 hover:text-indigo-700 transition-all"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Barra flutuante de bloco ativo (anti-esquecimento) */}
      {blocoAtivo && !cardAtivoVisivel && !mostrarForm && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div
              className={`flex items-center gap-3 rounded-2xl shadow-lg px-4 py-3 text-white ${
                blocoLongo ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-indigo-600 to-violet-600'
              }`}
            >
              <span className="w-2.5 h-2.5 bg-green-300 rounded-full animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{blocoAtivo.descricao}</p>
                <p className="text-xs text-white/70">{blocoLongo ? 'rodando há muito tempo' : 'em andamento'}</p>
              </div>
              <span className="font-mono font-bold tabular-nums text-base flex-shrink-0">{formatarRelogio(cronometro)}</span>
              <button
                onClick={encerrarAtual}
                className="flex-shrink-0 bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors"
              >
                Encerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de regras das moedas */}
      {mostrarRegras && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setMostrarRegras(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><span>🪙</span> Como ganhar moedas</h3>
              <button onClick={() => setMostrarRegras(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4 text-sm text-gray-700">
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">🎯</span>
                <p>
                  Documente pelo menos <strong>{Math.round(META_PCT * 100)}% da sua jornada</strong> ({formatarDuracao(meta)} por dia) e ganhe{' '}
                  <strong>{MOEDAS_BASE} moedas</strong>.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">🔥</span>
                <p>
                  Mantenha a <strong>ofensiva</strong>: cada dia útil seguido batendo a meta dá <strong>+{MOEDAS_BONUS_DIA} moedas</strong> (até +{MOEDAS_BONUS_MAX}/dia). Fins de semana não quebram a ofensiva.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">{nivel.emoji}</span>
                <p>
                  Acumule moedas e suba de nível. Você está em <strong className={nivel.cor}>{nivel.nome}</strong>
                  {proximoNivel
                    ? <> — faltam <strong>{faltaProxNivel} moedas</strong> para {proximoNivel.emoji} {proximoNivel.nome}.</>
                    : <> — nível máximo! 👑</>}
                </p>
              </div>

              {proximoNivel && (
                <div className="pt-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.round(progressoNivel * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <div className="text-lg font-bold text-gray-900 tabular-nums">{estatisticas.melhorStreak}</div>
                  <div className="text-xs text-gray-500">melhor ofensiva</div>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <div className="text-lg font-bold text-gray-900 tabular-nums">{estatisticas.diasQualificados}</div>
                  <div className="text-xs text-gray-500">dias com meta batida</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {NIVEIS.map(n => (
                  <span
                    key={n.nome}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      n.nome === nivel.nome ? `${n.corBg} ${n.cor} ring-1 ring-current` : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {n.emoji} {n.nome}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de novo/editar registro */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setModalAberto(false); setModalEditar(null) } }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {modalEditar ? 'Editar registro' : 'Nova atividade'}
              </h3>
              <button onClick={() => { setModalAberto(false); setModalEditar(null) }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <form onSubmit={salvarRegistro} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria *</label>
                <div className="grid grid-cols-2 gap-2">
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormCategoria(cat.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm text-left transition-colors ${
                        formCategoria === cat.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.cor }} />
                      <span className="text-xs leading-tight">{cat.nome}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição *</label>
                <input
                  type="text"
                  value={formDescricao}
                  onChange={e => setFormDescricao(e.target.value)}
                  placeholder="O que está fazendo?"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Participantes (opcional)</label>
                <input
                  type="text"
                  value={formParticipantes}
                  onChange={e => setFormParticipantes(e.target.value)}
                  placeholder="com Fulano, Ciclano..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Projeto (opcional)</label>
                <select
                  value={formProjeto}
                  onChange={e => setFormProjeto(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Sem projeto</option>
                  {projetos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              {areas.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Área</label>
                  <select
                    value={formArea}
                    onChange={e => setFormArea(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Sem área</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Início</label>
                  <input
                    type="datetime-local"
                    value={formInicio}
                    onChange={e => setFormInicio(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                {modalEditar && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Fim</label>
                    <input
                      type="datetime-local"
                      value={formFim}
                      onChange={e => setFormFim(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {erro && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setModalAberto(false); setModalEditar(null) }}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregando || !formCategoria}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {carregando ? 'Salvando...' : modalEditar ? 'Salvar alterações' : 'Iniciar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
