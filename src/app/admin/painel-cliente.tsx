'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fraunces } from 'next/font/google'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { estagioDragao } from '@/lib/dragao'
import DragaoSVG from '@/components/dragao-svg'
import { PERIODOS, type PainelData, type Kpi, type PessoaLinha } from '@/lib/painel'

const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })

const COR = {
  indigo: '#4f46e5',
  violet: '#7c3aed',
  emerald: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  slate: '#94a3b8',
}

function fmtH(h: number) {
  if (h >= 10) return `${Math.round(h)}h`
  return `${h.toFixed(1)}h`
}
function pct(n: number) {
  return `${Math.round(n)}%`
}

// ── Assinatura 80/20 ──────────────────────────────────────────
function Barra8020({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-1 w-20 overflow-hidden rounded-full ${className}`} aria-hidden="true">
      <div className="w-4/5 bg-indigo-100" />
      <div className="w-1/5 bg-emerald-400" />
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">
      <span className="h-px w-5 bg-current opacity-40" />
      {children}
    </div>
  )
}

function SecaoTitulo({ eyebrow, titulo, acao }: { eyebrow: string; titulo: string; acao?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className={`${fraunces.className} mt-1.5 text-xl font-medium tracking-tight text-gray-900 sm:text-2xl`}>{titulo}</h2>
      </div>
      {acao}
    </div>
  )
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
      <p className="text-sm text-gray-400">{children}</p>
    </div>
  )
}

function Delta({ kpi, suffixPct = false }: { kpi: Kpi; suffixPct?: boolean }) {
  if (kpi.delta === null) {
    return <span className="text-xs font-medium text-gray-400">— sem base anterior</span>
  }
  const up = kpi.delta >= 0
  const v = Math.abs(kpi.delta * 100)
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
        {up ? <path d="M6 9.5V2.5M3 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M6 2.5v7M3 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {v < 1000 ? v.toFixed(0) : '999+'}%{suffixPct ? '' : ''} vs. anterior
    </span>
  )
}

function CardKpi({
  rotulo, valor, sub, delta, destaque = false,
}: {
  rotulo: string; valor: React.ReactNode; sub?: React.ReactNode; delta?: React.ReactNode; destaque?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${destaque ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50' : 'border-gray-100 bg-white'}`}>
      <p className="text-xs font-medium text-gray-500">{rotulo}</p>
      <div className={`mt-1.5 ${fraunces.className} text-3xl font-semibold tracking-tight ${destaque ? 'text-indigo-700' : 'text-gray-900'}`}>
        {valor}
      </div>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      <div className="mt-2">{delta}</div>
    </div>
  )
}

// ── Tooltip recharts temático ────────────────────────────────
function TipBox({ active, payload, label, unidade = 'h' }: { active?: boolean; payload?: { name?: string; value?: number; payload?: Record<string, unknown> }[]; label?: string; unidade?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold text-gray-700">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600">
          {p.name ? `${p.name}: ` : ''}
          <span className="font-medium text-gray-900">{typeof p.value === 'number' ? (unidade === 'h' ? fmtH(p.value) : `${p.value}${unidade}`) : String(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ── Mini barra de mix de categorias ──────────────────────────
function MixBar({ mix }: { mix: PessoaLinha['mix'] }) {
  const segs = [
    { v: mix.focado, c: COR.emerald, l: 'Trabalho focado' },
    { v: mix.reuniao, c: COR.violet, l: 'Reunião' },
    { v: mix.imprevisto, c: COR.red, l: 'Imprevisto' },
    { v: mix.pausa, c: COR.slate, l: 'Pausa' },
    { v: mix.outros, c: '#cbd5e1', l: 'Outros' },
  ].filter(s => s.v > 0)
  if (segs.length === 0) return <span className="text-xs text-gray-300">—</span>
  return (
    <div className="flex h-2 w-full min-w-[80px] overflow-hidden rounded-full bg-gray-100" title={segs.map(s => `${s.l}: ${s.v}%`).join(' · ')}>
      {segs.map((s, i) => (
        <div key={i} style={{ width: `${s.v}%`, backgroundColor: s.c }} />
      ))}
    </div>
  )
}

export default function PainelCliente({ data }: { data: PainelData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [ordem, setOrdem] = useState<'horas' | 'aderencia'>('horas')

  function setFiltro(next: { periodo?: string; area?: string | null }) {
    const periodo = next.periodo ?? data.periodo
    const area = next.area === undefined ? data.areaSelecionada?.id ?? null : next.area
    const qs = new URLSearchParams()
    qs.set('periodo', periodo)
    if (area) qs.set('area', area)
    startTransition(() => router.push(`/admin?${qs.toString()}`))
  }

  const pessoasOrdenadas = [...data.pessoas].sort((a, b) => {
    if (ordem === 'horas') return b.horas - a.horas
    return (b.aderencia ?? -1) - (a.aderencia ?? -1)
  })

  const k = data.kpis

  return (
    <div className="space-y-8 pb-4">
      {/* ── Cabeçalho + filtros ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Visão de comando</Eyebrow>
          <h1 className={`${fraunces.className} mt-1.5 text-3xl font-semibold tracking-tight text-gray-900`}>Painel</h1>
          <div className="mt-2 flex items-center gap-2.5">
            <Barra8020 />
            <p className="text-sm text-gray-500">
              {data.intervaloLabel}
              {data.areaSelecionada && <> · {data.areaSelecionada.nome}</>}
              {' · '}{data.diasUteis} {data.diasUteis === 1 ? 'dia útil' : 'dias úteis'}
            </p>
          </div>
        </div>

        <div className={`flex flex-wrap items-center gap-2 ${pending ? 'opacity-60' : ''}`}>
          <div className="flex rounded-xl border border-gray-200 bg-white p-0.5">
            {PERIODOS.map(p => (
              <button
                key={p.id}
                onClick={() => setFiltro({ periodo: p.id })}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  data.periodo === p.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select
            value={data.areaSelecionada?.id ?? ''}
            onChange={e => setFiltro({ area: e.target.value || null })}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as áreas</option>
            {data.areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
      </div>

      {/* ── 1) KPIs ── */}
      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CardKpi
            rotulo="Horas registradas"
            valor={fmtH(k.horas.valor)}
            sub="blocos fechados no período"
            delta={<Delta kpi={k.horas} />}
          />
          <CardKpi
            rotulo="Colaboradores que registraram"
            valor={<>{k.registraram.valor}<span className="text-xl text-gray-300">/{k.registraram.total}</span></>}
            sub="pessoas ativas com registro"
            delta={<Delta kpi={k.registraram} />}
          />
          <CardKpi
            rotulo="Adesão"
            destaque
            valor={k.adesaoIndefinida ? '—' : pct(k.adesao.valor * 100)}
            sub={k.adesaoIndefinida ? 'sem dias úteis no período' : 'pessoa-dia com registro'}
            delta={k.adesaoIndefinida ? <span className="text-xs text-gray-400">saúde do sistema</span> : <Delta kpi={k.adesao} />}
          />
          <CardKpi
            rotulo="Aderência média à meta"
            valor={k.aderencia.valor > 0 || data.pessoas.some(p => p.aderencia !== null) ? pct(k.aderencia.valor) : '—'}
            sub="completude diária avaliada"
            delta={<Delta kpi={k.aderencia} />}
          />
        </div>
      </section>

      {/* ── 2) Onde vai o tempo ── */}
      <section>
        <SecaoTitulo eyebrow="Composição" titulo="Onde vai o tempo" />
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Rosca por categoria */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-700">Por categoria</p>
            {data.porCategoria.length === 0 ? (
              <Vazio>Ainda sem horas registradas no período.</Vazio>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-[180px] w-full max-w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.porCategoria} dataKey="horas" nameKey="nome" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="none">
                        {data.porCategoria.map((c, i) => <Cell key={i} fill={c.cor} />)}
                      </Pie>
                      <Tooltip content={<TipBox />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-1.5 self-stretch">
                  {data.porCategoria.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
                      <span className="flex-1 truncate text-gray-600">{c.nome}</span>
                      <span className="tabular-nums text-gray-400">{c.pct}%</span>
                      <span className="w-12 text-right tabular-nums font-medium text-gray-700">{fmtH(c.horas)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Barras por área */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-700">Por área</p>
            {data.porArea.length === 0 ? (
              <Vazio>Ainda sem horas por área no período.</Vazio>
            ) : (
              <div style={{ height: Math.max(140, data.porArea.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.porArea} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tickFormatter={v => `${v}h`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TipBox />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="horas" fill={COR.indigo} radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3) Carga × capacidade (destaque) ── */}
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-5 sm:p-6">
        <SecaoTitulo eyebrow="Dimensionamento" titulo="Carga × capacidade por área" />
        {!data.carga.temCapacidade ? (
          <Vazio>
            Para acompanhar carga × capacidade, atribua uma área a cada colaborador em{' '}
            <Link href="/admin/usuarios" className="font-medium text-indigo-600 underline">Usuários</Link>.
            {data.carga.linhas.length > 0 && ' Há horas registradas, mas nenhuma área tem capacidade cadastrada.'}
          </Vazio>
        ) : (
          <div className="space-y-4">
            {data.carga.linhas.map((l, i) => {
              const utilPct = l.util !== null ? l.util * 100 : 0
              const corEstado =
                l.estado === 'pressao' ? COR.red : l.estado === 'folga' ? COR.amber : COR.emerald
              const rotulo =
                l.estado === 'pressao' ? 'Sob pressão' : l.estado === 'folga' ? 'Com folga' : l.estado === 'ok' ? 'Equilibrada' : 'Sem capacidade'
              return (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{l.area}</span>
                      <span className="text-xs text-gray-400">{l.pessoas} {l.pessoas === 1 ? 'pessoa' : 'pessoas'}</span>
                    </div>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${corEstado}1a`, color: corEstado }}>
                      {l.util !== null ? `${Math.round(utilPct)}% · ${rotulo}` : rotulo}
                    </span>
                  </div>
                  {/* trilho capacidade + preenchimento carga */}
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all"
                      style={{ width: `${Math.min(100, utilPct)}%`, backgroundColor: corEstado }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-gray-400">
                    <span>Carga <span className="font-medium text-gray-600">{fmtH(l.carga)}</span></span>
                    <span>Capacidade <span className="font-medium text-gray-600">{fmtH(l.capacidade)}</span></span>
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-gray-400">
              Utilização ≥ 90% sinaliza pressão (possível falta de gente); ≤ 55% sinaliza folga. Capacidade = horas contratadas × dias úteis.
            </p>
          </div>
        )}
      </section>

      {/* ── 4) Pessoas ── */}
      <section>
        <SecaoTitulo
          eyebrow="Quem faz acontecer"
          titulo="Pessoas"
          acao={
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-400">Ordenar:</span>
              <button onClick={() => setOrdem('horas')} className={`rounded-lg px-2 py-1 font-medium ${ordem === 'horas' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>Horas</button>
              <button onClick={() => setOrdem('aderencia')} className={`rounded-lg px-2 py-1 font-medium ${ordem === 'aderencia' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>Aderência</button>
            </div>
          }
        />
        {data.pessoas.length === 0 ? (
          <Vazio>Nenhum colaborador ativo {data.areaSelecionada ? 'nesta área' : ''} no período.</Vazio>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Horas</th>
                    <th className="px-4 py-3">Mix de atividades</th>
                    <th className="px-4 py-3">Aderência</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pessoasOrdenadas.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.nome}</div>
                        <div className="text-xs text-gray-400">{[p.cargo, p.area].filter(Boolean).join(' · ') || '—'}</div>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium text-gray-800">{fmtH(p.horas)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MixBar mix={p.mix} />
                          {p.alertaFoco && <span title="Pouco trabalho focado" className="text-amber-500">⚠</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.aderencia === null ? (
                          <span className="text-sm text-gray-300">—</span>
                        ) : (
                          <span className={`text-sm font-semibold ${p.aderencia >= 80 ? 'text-emerald-600' : p.aderencia >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>{p.aderencia}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.registrouHoje ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">● registrou hoje</span>
                        ) : p.diasSemRegistrar === null ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">sem registros</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${p.diasSemRegistrar >= 2 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'}`}>
                            há {p.diasSemRegistrar} {p.diasSemRegistrar === 1 ? 'dia útil' : 'dias úteis'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── 5) Tendência ── */}
      <section>
        <SecaoTitulo eyebrow="Adoção" titulo="Tendência de horas registradas" />
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {data.tendencia.every(t => t.horas === 0) ? (
            <Vazio>Ainda sem dados no período para desenhar a tendência.</Vazio>
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.tendencia} margin={{ left: -16, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="gradTend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COR.indigo} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COR.indigo} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tickFormatter={v => `${v}h`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={42} />
                  <Tooltip content={<TipBox />} cursor={{ stroke: '#c7d2fe' }} />
                  <Area type="monotone" dataKey="horas" stroke={COR.indigo} strokeWidth={2} fill="url(#gradTend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* ── 6) Sinais de atenção + engajamento ── */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SecaoTitulo eyebrow="Ação" titulo="Sinais de atenção" />
          {data.sinais.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
              <span className="text-xl">✓</span>
              <p className="text-sm text-emerald-800">Tudo em dia — nenhum sinal de atenção no período.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.sinais.map((s, i) => (
                <li key={i} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <span className={`mt-0.5 inline-block h-2 w-2 flex-shrink-0 rounded-full ${s.severidade === 'alta' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                  <p className="text-sm text-gray-700">{s.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Engajamento (dragões) */}
        <div>
          <SecaoTitulo eyebrow="Cultura" titulo="Dragões da equipe" />
          <div className="space-y-2 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
            {data.engajamento.length === 0 ? (
              <Vazio>Sem colaboradores no escopo.</Vazio>
            ) : (
              data.engajamento.map((e, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2">
                  <DragaoSVG estagio={estagioDragao(e.moedas).chave} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-emerald-900">{e.nome}</p>
                    <p className="text-xs text-emerald-700/70">{e.estagio}</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-amber-600">🪙 {e.moedas}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── 7) Atalhos ── */}
      <section className="border-t border-gray-100 pt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Aprofundar</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { href: '/admin/relatorios', titulo: 'Relatórios', desc: 'Detalhe e exportação' },
            { href: '/admin/usuarios', titulo: 'Usuários', desc: 'Pessoas e áreas' },
            { href: '/admin/areas', titulo: 'Áreas', desc: 'Estrutura' },
            { href: '/admin/projetos', titulo: 'Projetos', desc: 'Iniciativas' },
            { href: '/admin/categorias', titulo: 'Categorias', desc: 'Tipos de atividade' },
          ].map(a => (
            <Link key={a.href} href={a.href} className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
              <p className="font-semibold text-gray-900 group-hover:text-indigo-700">{a.titulo}</p>
              <p className="mt-0.5 text-xs text-gray-400">{a.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
