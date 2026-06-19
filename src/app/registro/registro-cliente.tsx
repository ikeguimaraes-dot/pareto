'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInSeconds, parseISO, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Profile, CategoriaAtividade, Projeto, Area, Registro, RegistroComRelacoes } from '@/types/database'

interface Props {
  profile: Profile & { areas?: { nome: string } | null }
  categorias: CategoriaAtividade[]
  projetos: Projeto[]
  areas: Area[]
}

function formatarDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

function calcularDuracao(inicio: string, fim: string | null): number {
  const fimDate = fim ? parseISO(fim) : new Date()
  return differenceInSeconds(fimDate, parseISO(inicio))
}

export default function RegistroCliente({ profile, categorias, projetos, areas }: Props) {
  const supabase = createClient()

  const [registrosHoje, setRegistrosHoje] = useState<RegistroComRelacoes[]>([])
  const [blocoAtivo, setBlocoAtivo] = useState<RegistroComRelacoes | null>(null)
  const [cronometro, setCronometro] = useState(0)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalEditar, setModalEditar] = useState<RegistroComRelacoes | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  // Form do modal
  const [formCategoria, setFormCategoria] = useState('')
  const [formProjeto, setFormProjeto] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formParticipantes, setFormParticipantes] = useState('')
  const [formInicio, setFormInicio] = useState('')
  const [formFim, setFormFim] = useState('')
  const [formArea, setFormArea] = useState(profile.area_id ?? '')

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

  useEffect(() => {
    carregarRegistros()
  }, [carregarRegistros])

  useEffect(() => {
    if (!blocoAtivo) return
    const interval = setInterval(() => {
      setCronometro(calcularDuracao(blocoAtivo.inicio, null))
    }, 1000)
    return () => clearInterval(interval)
  }, [blocoAtivo])

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
    await supabase
      .from('registros')
      .update({ fim: new Date().toISOString() })
      .eq('id', id)
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
        // Encerrar bloco ativo se existir
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

      await carregarRegistros()
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
    await encerrarBloco(blocoAtivo.id)
    await carregarRegistros()
  }

  async function encerrarEIniciarProxima() {
    if (blocoAtivo) await encerrarBloco(blocoAtivo.id)
    await carregarRegistros()
    abrirModalNovo()
  }

  async function atalhoRapido(descricao: string, categoriaId?: string) {
    if (blocoAtivo) await encerrarBloco(blocoAtivo.id)
    const catId = categoriaId ?? categorias.find(c => c.nome.includes('Pausa'))?.id ?? categorias[0]?.id
    if (!catId) return
    await supabase.from('registros').insert({
      user_id: profile.id,
      categoria_id: catId,
      descricao,
      area_id: profile.area_id,
      inicio: new Date().toISOString(),
    })
    await carregarRegistros()
  }

  const totalSegundos = registrosHoje.reduce((acc, r) => acc + calcularDuracao(r.inicio, r.fim), 0)

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const mostrarForm = modalAberto || modalEditar !== null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-indigo-600">Pareto</span>
          <span className="hidden sm:inline text-sm text-gray-400">|</span>
          <span className="hidden sm:inline text-sm text-gray-600">{profile.nome}</span>
          {profile.areas && (
            <span className="hidden sm:inline text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {(profile.areas as { nome: string }).nome}
            </span>
          )}
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Sair
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Bloco ativo */}
        {blocoAtivo ? (
          <div className="bg-indigo-600 text-white rounded-2xl p-5 shadow-md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-indigo-200 uppercase tracking-wide">Em andamento</span>
                </div>
                <p className="font-semibold text-lg leading-tight">{blocoAtivo.descricao}</p>
                {blocoAtivo.participantes && (
                  <p className="text-sm text-indigo-200 mt-0.5">com {blocoAtivo.participantes}</p>
                )}
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <div className="text-3xl font-mono font-bold">{formatarDuracao(cronometro)}</div>
                {blocoAtivo.categorias_atividade && (
                  <span className="text-xs text-indigo-200">{blocoAtivo.categorias_atividade.nome}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={encerrarEIniciarProxima}
                className="flex-1 bg-white text-indigo-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors"
              >
                Encerrar e iniciar próxima
              </button>
              <button
                onClick={encerrarAtual}
                className="bg-indigo-500 text-white py-2 px-3 rounded-xl text-sm font-medium hover:bg-indigo-400 transition-colors"
              >
                Só encerrar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={abrirModalNovo}
            className="w-full bg-indigo-600 text-white rounded-2xl p-5 text-center hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <div className="text-2xl mb-1">+</div>
            <div className="font-semibold text-lg">Iniciar atividade</div>
            <div className="text-sm text-indigo-200">Toque para registrar o que você está fazendo</div>
          </button>
        )}

        {/* Atalhos rápidos */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => atalhoRapido('Chegada / início do expediente')}
            className="flex-1 min-w-[calc(50%-0.25rem)] bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            Cheguei
          </button>
          <button
            onClick={() => atalhoRapido('Saída para almoço')}
            className="flex-1 min-w-[calc(50%-0.25rem)] bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            Almoço
          </button>
          <button
            onClick={async () => {
              if (blocoAtivo) await encerrarBloco(blocoAtivo.id)
              await carregarRegistros()
            }}
            className="flex-1 min-w-[calc(50%-0.25rem)] bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            Fim do expediente
          </button>
          <button
            onClick={abrirModalNovo}
            className="flex-1 min-w-[calc(50%-0.25rem)] bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            + Novo bloco
          </button>
        </div>

        {/* Linha do tempo do dia */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
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
                    <div className="flex-shrink-0 mt-0.5 w-3 h-3 rounded-full mt-1.5" style={{ backgroundColor: cat?.cor ?? '#6B7280' }} />
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
