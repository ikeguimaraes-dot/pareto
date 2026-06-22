'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO, differenceInSeconds, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Profile, PontuacaoDiaria } from '@/types/database'
import { estagioDragao, faltaProximoEstagio, temAsas, ESTAGIOS_DRAGAO } from '@/lib/dragao'
import DragaoSVG from '@/components/dragao-svg'

interface Props {
  profile: Profile & { areas?: { nome: string } | null }
}

function calcularIdade(dataNascimento: string): number {
  const hoje = new Date()
  const nasc = new Date(dataNascimento + 'T00:00:00')
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

function formatarDuracaoCurta(segundos: number): string {
  const s = Math.max(0, segundos)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`
  return `${m}min`
}

export default function PerfilCliente({ profile }: Props) {
  const supabase = createClient()

  // ── Gamificação (saldo e histórico vêm SEMPRE do banco) ──────
  const [moedas, setMoedas] = useState(profile.moedas ?? 0)
  const [pontuacoes, setPontuacoes] = useState<PontuacaoDiaria[]>([])
  const [registrosHoje, setRegistrosHoje] = useState<{ inicio: string; fim: string | null }[]>([])
  const [carregandoGam, setCarregandoGam] = useState(true)
  const [tick, setTick] = useState(0)

  const carregarGamificacao = useCallback(async () => {
    // 1) Atualiza moedas/histórico no banco (idempotente). 2) Lê para exibir.
    try {
      await supabase.rpc('processar_pontuacao_diaria')
    } catch {
      // Se a função falhar, ainda exibimos o último estado conhecido.
    }
    const agora = new Date()
    const [prof, pts, regs] = await Promise.all([
      supabase.from('profiles').select('moedas').eq('id', profile.id).single(),
      supabase
        .from('pontuacao_diaria')
        .select('*')
        .eq('user_id', profile.id)
        .order('data', { ascending: false })
        .limit(30),
      supabase
        .from('registros')
        .select('inicio, fim')
        .eq('user_id', profile.id)
        .gte('inicio', startOfDay(agora).toISOString())
        .lte('inicio', endOfDay(agora).toISOString()),
    ])
    if (typeof prof.data?.moedas === 'number') setMoedas(prof.data.moedas)
    setPontuacoes(pts.data ?? [])
    setRegistrosHoje(regs.data ?? [])
    setCarregandoGam(false)
  }, [supabase, profile.id])

  useEffect(() => {
    carregarGamificacao()
  }, [carregarGamificacao])

  // Cronômetro ao vivo só enquanto houver bloco em aberto hoje
  const temBlocoAberto = registrosHoje.some(r => !r.fim)
  useEffect(() => {
    if (!temBlocoAberto) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [temBlocoAberto])

  const segundosHoje = useMemo(() => {
    const agora = new Date()
    return registrosHoje.reduce((acc, r) => {
      const fim = r.fim ? parseISO(r.fim) : agora
      return acc + Math.max(0, differenceInSeconds(fim, parseISO(r.inicio)))
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrosHoje, tick])

  const horasContratadas = profile.horas_dia_contratadas || 8
  const metaSegundosHoje = horasContratadas * 3600
  const pctHoje = metaSegundosHoje > 0 ? segundosHoje / metaSegundosHoje : 0
  const pctHojeLabel = Math.round(pctHoje * 100)

  const estagio = estagioDragao(moedas)
  const asas = temAsas(pontuacoes)
  const prox = faltaProximoEstagio(moedas)
  const ultimos7 = pontuacoes.slice(0, 7)

  // ── Formulário de informações pessoais ──────────────────────
  const [form, setForm] = useState({
    nome: profile.nome,
    sobrenome: profile.sobrenome ?? '',
    data_nascimento: profile.data_nascimento ?? '',
    cargo: profile.cargo ?? '',
    descricao_cargo: profile.descricao_cargo ?? '',
  })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const idade = form.data_nascimento ? calcularIdade(form.data_nascimento) : null

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setMensagem('')
    setErro('')

    const { error } = await supabase
      .from('profiles')
      .update({
        nome: form.nome.trim(),
        sobrenome: form.sobrenome.trim() || null,
        data_nascimento: form.data_nascimento || null,
        cargo: form.cargo.trim() || null,
        descricao_cargo: form.descricao_cargo.trim() || null,
      })
      .eq('id', profile.id)

    setSalvando(false)
    if (error) {
      setErro(error.message)
    } else {
      setMensagem('Perfil atualizado com sucesso.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/registro" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors">
          ← Voltar
        </Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-900">Meu perfil</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* ─────────────── Dragão da consistência ─────────────── */}
        <section className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-100 overflow-hidden">
          <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center">
            <div className="relative">
              <DragaoSVG estagio={estagio.chave} asas={asas} size={150} className={carregandoGam ? 'opacity-60' : 'transition-opacity'} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-lg font-bold text-emerald-900">Dragão {estagio.nome}</h2>
              {asas && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  🪽 Com asas
                </span>
              )}
            </div>
            <p className="text-sm text-emerald-700/80 mt-1 max-w-xs">{estagio.descricao}</p>

            {/* Saldo de moedas */}
            <div className="mt-4 inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-amber-100">
              <span className="text-xl leading-none">🪙</span>
              <span className="text-2xl font-bold text-gray-900 tabular-nums">{moedas}</span>
              <span className="text-sm text-gray-500">moedas</span>
            </div>

            {prox ? (
              <p className="text-xs text-emerald-700/70 mt-2">
                Faltam <strong>{prox.falta}</strong> {prox.falta === 1 ? 'moeda' : 'moedas'} para o dragão {prox.proximo.nome}.
              </p>
            ) : (
              <p className="text-xs text-emerald-700/70 mt-2">Forma máxima alcançada. Mantenha a consistência para conservar as asas! 🐉</p>
            )}
          </div>

          {/* Progresso de HOJE (ao vivo) */}
          <div className="bg-white/70 border-t border-emerald-100 px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">Progresso de hoje</span>
              <span className="text-sm font-bold tabular-nums text-emerald-700">
                {formatarDuracaoCurta(segundosHoje)} / {formatarDuracaoCurta(metaSegundosHoje)} · {pctHojeLabel}%
              </span>
            </div>
            <div className="h-2.5 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, pctHojeLabel))}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Mede as horas que você já registrou hoje sobre as {horasContratadas}h contratadas.
              {' '}As moedas de hoje só são <strong>contabilizadas amanhã</strong>, quando o dia é avaliado.
            </p>
          </div>
        </section>

        {/* ─────────────── Mini-histórico (últimos 7 dias avaliados) ─────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Últimos dias avaliados</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pontuação fechada de cada dia, do banco.</p>
          </div>
          {carregandoGam ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Carregando histórico…</div>
          ) : ultimos7.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Nenhum dia avaliado ainda. Registre seu expediente e volte amanhã. 🐣
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {ultimos7.map(p => {
                const data = parseISO(p.data + 'T00:00:00')
                const ganhou = p.moedas_delta > 0
                const perdeu = p.moedas_delta < 0
                return (
                  <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.bateu_meta ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {format(data, "EEE, d 'de' MMM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-gray-400">{p.percentual}% da jornada {p.bateu_meta ? '· meta batida' : '· abaixo da meta'}</p>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums flex-shrink-0 ${
                        ganhou ? 'text-emerald-600' : perdeu ? 'text-rose-500' : 'text-gray-400'
                      }`}
                    >
                      {ganhou ? `+${p.moedas_delta}` : p.moedas_delta} 🪙
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ─────────────── Legenda da regra de moedas (faixas) ─────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Como o dragão cresce</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Bata sua meta diária para ganhar moedas; dias incompletos descontam. O estágio segue o saldo:
            </p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ESTAGIOS_DRAGAO.map(e => {
              const ativo = e.chave === estagio.chave
              const faixa = e.max === null ? `${e.min}+ moedas` : e.min === e.max ? `${e.min} moedas` : `${e.min}–${e.max} moedas`
              return (
                <div
                  key={e.chave}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 border ${
                    ativo ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <DragaoSVG estagio={e.chave} size={40} />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${ativo ? 'text-emerald-800' : 'text-gray-700'}`}>{e.nome}</p>
                    <p className="text-xs text-gray-400 tabular-nums">{faixa}</p>
                  </div>
                  {ativo && <span className="ml-auto text-[10px] font-bold text-emerald-600 uppercase">Você</span>}
                </div>
              )
            })}
          </div>
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-500 flex items-start gap-2 bg-emerald-50/60 rounded-xl px-3 py-2">
              <span>🪽</span>
              <span>Asas: garanta <strong>20 metas batidas nos últimos 30 dias avaliados</strong> (precisa ter ao menos 30 dias avaliados) e seu dragão ganha asas.</span>
            </p>
          </div>
        </section>

        {/* ─────────────── Informações pessoais ─────────────── */}
        <form onSubmit={salvar} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Informações pessoais</h2>
            <p className="text-xs text-gray-500 mt-0.5">E-mail e área são definidos pelo administrador.</p>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
              />
            </div>

            {profile.areas && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Área</label>
                <input
                  type="text"
                  value={(profile.areas as { nome: string }).nome}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sobrenome</label>
                <input
                  type="text"
                  value={form.sobrenome}
                  onChange={e => setForm({ ...form, sobrenome: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data de nascimento
                {idade !== null && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{idade} anos</span>
                )}
              </label>
              <input
                type="date"
                value={form.data_nascimento}
                onChange={e => setForm({ ...form, data_nascimento: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cargo</label>
              <input
                type="text"
                value={form.cargo}
                onChange={e => setForm({ ...form, cargo: e.target.value })}
                placeholder="Ex: Gerente de Projetos"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição do cargo</label>
              <textarea
                value={form.descricao_cargo}
                onChange={e => setForm({ ...form, descricao_cargo: e.target.value })}
                rows={3}
                placeholder="Descreva suas responsabilidades principais..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {erro && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>
            )}
            {mensagem && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{mensagem}</div>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
