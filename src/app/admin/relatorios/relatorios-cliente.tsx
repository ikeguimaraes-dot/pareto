'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInSeconds, parseISO, startOfDay, endOfDay } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  type PieLabelRenderProps
} from 'recharts'

interface RegistroCompleto {
  id: string
  user_id: string
  area_id: string | null
  categoria_id: string
  projeto_id: string | null
  descricao: string
  inicio: string
  fim: string | null
  profiles?: { nome: string; area_id: string | null; horas_dia_contratadas: number } | null
  categorias_atividade?: { nome: string; cor: string } | null
  projetos?: { nome: string } | null
  areas?: { nome: string } | null
}

interface Props {
  registros: RegistroCompleto[]
  areas: { id: string; nome: string }[]
  usuarios: { id: string; nome: string; area_id: string | null; horas_dia_contratadas: number }[]
  categorias: { id: string; nome: string; cor: string }[]
  dataInicioDefault: string
  dataFimDefault: string
}

function horas(segundos: number) { return +(segundos / 3600).toFixed(2) }
function fmt(h: number) { return `${h.toFixed(1)}h` }

type AbaId = 'tempo' | 'pessoas' | 'projetos' | 'benchmark' | 'carga' | '8020'

const ABAS: { id: AbaId; label: string }[] = [
  { id: 'tempo', label: 'Onde o tempo vai' },
  { id: 'pessoas', label: 'Tempo por pessoa' },
  { id: 'projetos', label: 'Por projeto' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'carga', label: 'Carga vs. capacidade' },
  { id: '8020', label: '80/20' },
]

export default function RelatoriosCliente({ registros: registrosInit, areas, usuarios, categorias, dataInicioDefault, dataFimDefault }: Props) {
  const supabase = createClient()
  const [aba, setAba] = useState<AbaId>('tempo')
  const [dataInicio, setDataInicio] = useState(dataInicioDefault)
  const [dataFim, setDataFimState] = useState(dataFimDefault)
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [registros, setRegistros] = useState<RegistroCompleto[]>(registrosInit)
  const [carregando, setCarregando] = useState(false)

  async function buscarRegistros() {
    setCarregando(true)
    let query = supabase
      .from('registros')
      .select('*, profiles(nome, area_id, horas_dia_contratadas), categorias_atividade(nome, cor), projetos(nome), areas(nome)')
      .gte('inicio', startOfDay(new Date(dataInicio)).toISOString())
      .lte('inicio', endOfDay(new Date(dataFim)).toISOString())
      .not('fim', 'is', null)
      .order('inicio', { ascending: false })

    if (filtroArea) query = query.eq('area_id', filtroArea)
    if (filtroUsuario) query = query.eq('user_id', filtroUsuario)

    const { data } = await query
    setRegistros(data ?? [])
    setCarregando(false)
  }

  const totalSegundos = useMemo(() =>
    registros.reduce((acc, r) => acc + (r.fim ? differenceInSeconds(parseISO(r.fim), parseISO(r.inicio)) : 0), 0),
    [registros]
  )

  // Relatório 1: por categoria
  const porCategoria = useMemo(() => {
    const map = new Map<string, { nome: string; cor: string; segundos: number }>()
    registros.forEach(r => {
      const cat = r.categorias_atividade
      if (!cat) return
      const key = r.categoria_id
      const atual = map.get(key) ?? { nome: cat.nome, cor: cat.cor, segundos: 0 }
      atual.segundos += r.fim ? differenceInSeconds(parseISO(r.fim), parseISO(r.inicio)) : 0
      map.set(key, atual)
    })
    return Array.from(map.values())
      .map(v => ({ ...v, horas: horas(v.segundos), pct: totalSegundos > 0 ? +(v.segundos / totalSegundos * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.segundos - a.segundos)
  }, [registros, totalSegundos])

  // Relatório 2: por pessoa
  const porPessoa = useMemo(() => {
    const map = new Map<string, { nome: string; segundos: number; porCategoria: Record<string, number> }>()
    registros.forEach(r => {
      const profile = r.profiles
      if (!profile) return
      const dur = r.fim ? differenceInSeconds(parseISO(r.fim), parseISO(r.inicio)) : 0
      const atual = map.get(r.user_id) ?? { nome: profile.nome, segundos: 0, porCategoria: {} }
      atual.segundos += dur
      const catNome = r.categorias_atividade?.nome ?? 'Outros'
      atual.porCategoria[catNome] = (atual.porCategoria[catNome] ?? 0) + dur
      map.set(r.user_id, atual)
    })
    return Array.from(map.values())
      .map(v => ({ ...v, horas: horas(v.segundos) }))
      .sort((a, b) => b.segundos - a.segundos)
  }, [registros])

  // Relatório 3: por projeto
  const porProjeto = useMemo(() => {
    const map = new Map<string, { nome: string; segundos: number }>()
    registros.forEach(r => {
      if (!r.projeto_id || !r.projetos) return
      const dur = r.fim ? differenceInSeconds(parseISO(r.fim), parseISO(r.inicio)) : 0
      const atual = map.get(r.projeto_id) ?? { nome: r.projetos.nome, segundos: 0 }
      atual.segundos += dur
      map.set(r.projeto_id, atual)
    })
    return Array.from(map.values())
      .map(v => ({ ...v, horas: horas(v.segundos) }))
      .sort((a, b) => b.segundos - a.segundos)
  }, [registros])

  // Relatório 4: benchmark
  const benchmark = useMemo(() => {
    const map = new Map<string, { descricao: string; catNome: string; ocorrencias: number; totalSegundos: number }>()
    registros.forEach(r => {
      if (!r.fim) return
      const dur = differenceInSeconds(parseISO(r.fim), parseISO(r.inicio))
      if (dur < 60) return
      const key = `${r.categoria_id}::${r.descricao.toLowerCase().trim()}`
      const atual = map.get(key) ?? { descricao: r.descricao, catNome: r.categorias_atividade?.nome ?? '—', ocorrencias: 0, totalSegundos: 0 }
      atual.ocorrencias += 1
      atual.totalSegundos += dur
      map.set(key, atual)
    })
    return Array.from(map.values())
      .filter(v => v.ocorrencias >= 2)
      .map(v => ({ ...v, mediaHoras: horas(v.totalSegundos / v.ocorrencias) }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias)
      .slice(0, 20)
  }, [registros])

  // Relatório 5: carga vs capacidade (por área)
  const cargaVsCapacidade = useMemo(() => {
    const diasPeriodo = Math.max(1, Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / 86400000) + 1)
    const diasUteis = Math.round(diasPeriodo * 5 / 7)

    return areas.map(area => {
      const colaboradoresArea = usuarios.filter(u => u.area_id === area.id)
      const capacidadeH = colaboradoresArea.reduce((acc, u) => acc + u.horas_dia_contratadas * diasUteis, 0)
      const registrosArea = registros.filter(r => r.area_id === area.id)
      const hRegistradas = horas(registrosArea.reduce((acc, r) => acc + (r.fim ? differenceInSeconds(parseISO(r.fim), parseISO(r.inicio)) : 0), 0))
      const pct = capacidadeH > 0 ? +(hRegistradas / capacidadeH * 100).toFixed(1) : 0
      return { area: area.nome, capacidade: +capacidadeH.toFixed(1), registradas: hRegistradas, pct, colaboradores: colaboradoresArea.length }
    }).filter(r => r.colaboradores > 0)
  }, [registros, areas, usuarios, dataInicio, dataFim])

  // Relatório 6: 80/20
  const ranking8020 = useMemo(() => {
    return porPessoa.map((p, i) => ({
      ...p,
      posicao: i + 1,
      pctTotal: totalSegundos > 0 ? +(p.segundos / totalSegundos * 100).toFixed(1) : 0,
    }))
  }, [porPessoa, totalSegundos])

  function exportarCSV(dados: Record<string, unknown>[], nome: string) {
    if (dados.length === 0) return
    const keys = Object.keys(dados[0])
    const header = keys.join(';')
    const rows = dados.map(row => keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(';'))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pareto_${nome}_${dataInicio}_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const CORES = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6']

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
            <input type="date" value={dataFim} onChange={e => setDataFimState(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Área</label>
            <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pessoa</label>
            <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <button onClick={buscarRegistros} disabled={carregando}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {carregando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">{registros.length} registros · {fmt(horas(totalSegundos))} no período</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              aba === a.id ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {aba === 'tempo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Onde o tempo vai — por categoria</h2>
            <button onClick={() => exportarCSV(porCategoria.map(c => ({ categoria: c.nome, horas: c.horas, porcentagem: c.pct })), 'categorias')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Exportar CSV</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={porCategoria} dataKey="horas" nameKey="nome" cx="50%" cy="50%" outerRadius={90} label={(props: PieLabelRenderProps) => String((props as unknown as { pct?: number }).pct ?? 0) + '%'}>
                    {porCategoria.map((entry, i) => (
                      <Cell key={i} fill={entry.cor || CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(1)}h` : v} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Categoria</th>
                    <th className="text-right px-4 py-3">Horas</th>
                    <th className="text-right px-4 py-3">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {porCategoria.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.cor }} />
                          <span className="text-sm text-gray-800">{c.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-medium">{fmt(c.horas)}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-gray-500">{c.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {aba === 'pessoas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Tempo por pessoa</h2>
            <button onClick={() => exportarCSV(porPessoa.map(p => ({ pessoa: p.nome, horas: p.horas })), 'pessoas')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Exportar CSV</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porPessoa} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `${v}h`} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(1)}h` : v} />
                <Bar dataKey="horas" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Pessoa</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Mix de atividades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {porPessoa.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-sm text-gray-900">{p.nome}</td>
                    <td className="px-4 py-3 text-right text-sm">{fmt(p.horas)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(p.porCategoria)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([cat, seg]) => (
                            <span key={cat} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {cat}: {fmt(horas(seg))}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'projetos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Tempo por projeto</h2>
            <button onClick={() => exportarCSV(porProjeto.map(p => ({ projeto: p.nome, horas: p.horas })), 'projetos')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Exportar CSV</button>
          </div>
          {porProjeto.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">Nenhum registro com projeto no período.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Projeto</th>
                    <th className="text-right px-4 py-3">Horas</th>
                    <th className="text-right px-4 py-3">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {porProjeto.map((p, i) => {
                    const totalH = horas(porProjeto.reduce((a, x) => a + x.segundos, 0))
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-sm text-gray-900">{p.nome}</td>
                        <td className="px-4 py-3 text-right text-sm">{fmt(p.horas)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">
                          {totalH > 0 ? (p.horas / totalH * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {aba === 'benchmark' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Benchmark de tarefas recorrentes</h2>
            <button onClick={() => exportarCSV(benchmark.map(b => ({ descricao: b.descricao, categoria: b.catNome, ocorrencias: b.ocorrencias, media_horas: b.mediaHoras })), 'benchmark')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Exportar CSV</button>
          </div>
          <p className="text-sm text-gray-500">Tarefas com 2+ ocorrências. Agrupadas por categoria + descrição similar.</p>
          {benchmark.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">Dados insuficientes para benchmark. Amplie o período ou aguarde mais registros.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Descrição</th>
                    <th className="text-left px-4 py-3">Categoria</th>
                    <th className="text-right px-4 py-3">Ocorrências</th>
                    <th className="text-right px-4 py-3">Média</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {benchmark.map((b, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{b.descricao}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{b.catNome}</td>
                      <td className="px-4 py-3 text-right text-sm">{b.ocorrencias}×</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{fmt(b.mediaHoras)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {aba === 'carga' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Carga vs. capacidade por área</h2>
            <button onClick={() => exportarCSV(cargaVsCapacidade.map(c => ({ area: c.area, capacidade_h: c.capacidade, registradas_h: c.registradas, utilizacao_pct: c.pct })), 'carga')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Exportar CSV</button>
          </div>
          {cargaVsCapacidade.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">Nenhuma área com colaboradores para comparar.</div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={cargaVsCapacidade}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `${v}h`} />
                    <Tooltip formatter={(v) => typeof v === 'number' ? `${v}h` : v} />
                    <Legend />
                    <Bar dataKey="capacidade" name="Capacidade" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="registradas" name="Registradas" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Área</th>
                      <th className="text-right px-4 py-3">Pessoas</th>
                      <th className="text-right px-4 py-3">Capacidade</th>
                      <th className="text-right px-4 py-3">Registradas</th>
                      <th className="text-right px-4 py-3">Utilização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cargaVsCapacidade.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-sm text-gray-900">{c.area}</td>
                        <td className="px-4 py-3 text-right text-sm">{c.colaboradores}</td>
                        <td className="px-4 py-3 text-right text-sm">{fmt(c.capacidade)}</td>
                        <td className="px-4 py-3 text-right text-sm">{fmt(c.registradas)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${c.pct > 100 ? 'text-red-600' : c.pct > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {c.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {aba === '8020' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Concentração 80/20 — quem produz mais?</h2>
            <button onClick={() => exportarCSV(ranking8020.map(p => ({ posicao: p.posicao, pessoa: p.nome, horas: p.horas, pct_do_total: p.pctTotal })), '8020')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Exportar CSV</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Pessoa</th>
                  <th className="text-right px-4 py-3">Horas</th>
                  <th className="text-right px-4 py-3">% do total</th>
                  <th className="text-right px-4 py-3">% acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  let acum = 0
                  return ranking8020.map((p) => {
                    acum += p.pctTotal
                    return (
                      <tr key={p.posicao} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{p.posicao}</td>
                        <td className="px-4 py-3 font-medium text-sm text-gray-900">{p.nome}</td>
                        <td className="px-4 py-3 text-right text-sm">{fmt(p.horas)}</td>
                        <td className="px-4 py-3 text-right text-sm">{p.pctTotal}%</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${acum <= 80 ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {acum.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">Valores em azul = dentro da faixa de 80% do total de horas registradas.</p>
        </div>
      )}
    </div>
  )
}
