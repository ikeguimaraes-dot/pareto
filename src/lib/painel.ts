// ============================================================
// Agregações do painel /admin — TUDO calculado no servidor.
// Regras (fixas, para os números baterem):
//  • Durações só de blocos fechados (fim != null).
//  • Fronteiras de dia no fuso America/Sao_Paulo (UTC−3, sem DST
//    desde 2019 — igual à função processar_pontuacao_diaria).
//  • Dias úteis = seg–sex.
//  • A "área" de uma hora é a ÁREA DO COLABORADOR (profiles.area_id),
//    não a tag do bloco — assim capacidade e carga usam as mesmas
//    pessoas e a utilização faz sentido.
// ============================================================

export type PeriodoId = 'hoje' | '7d' | '30d' | 'mes'

export const PERIODOS: { id: PeriodoId; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
]

export interface RawRegistro {
  user_id: string
  area_id: string | null
  categoria_id: string
  inicio: string
  fim: string | null
}
export interface RawPontuacao {
  user_id: string
  data: string // 'yyyy-MM-dd' (já em SP)
  percentual: number
  bateu_meta: boolean
  moedas_delta: number
}
export interface RawProfile {
  id: string
  nome: string
  sobrenome: string | null
  role: string
  area_id: string | null
  cargo: string | null
  horas_dia_contratadas: number
  ativo: boolean
  moedas: number
}
export interface RawArea {
  id: string
  nome: string
}
export interface RawCategoria {
  id: string
  nome: string
  cor: string
}

// ── Fuso SP (UTC−3 constante) ────────────────────────────────
const SP_OFFSET_MS = 3 * 60 * 60 * 1000

function pad(n: number) {
  return String(n).padStart(2, '0')
}
/** 'yyyy-MM-dd' do dia-calendário SP de um instante UTC. */
export function spDayStr(d: Date): string {
  const s = new Date(d.getTime() - SP_OFFSET_MS)
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`
}
/** Instante UTC da meia-noite SP de uma data SP (y,m,d 1-based). */
function spMidnightUTC(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + SP_OFFSET_MS)
}
function spPartsOf(dayStr: string) {
  const [y, m, d] = dayStr.split('-').map(Number)
  return { y, m, d }
}
/** dow de um 'yyyy-MM-dd' (0=dom..6=sáb). A data-calendário define o dia da semana. */
function dowDe(dayStr: string): number {
  const { y, m, d } = spPartsOf(dayStr)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}
function ehDiaUtil(dayStr: string): boolean {
  const dow = dowDe(dayStr)
  return dow >= 1 && dow <= 5
}
/** Lista de 'yyyy-MM-dd' de inicioDay até fimDay (inclusive). */
function listarDias(inicioDay: string, fimDay: string): string[] {
  const out: string[] = []
  const a = spPartsOf(inicioDay)
  let cur = spMidnightUTC(a.y, a.m, a.d)
  const fim = (() => {
    const b = spPartsOf(fimDay)
    return spMidnightUTC(b.y, b.m, b.d)
  })()
  while (cur.getTime() <= fim.getTime()) {
    out.push(spDayStr(cur))
    cur = new Date(cur.getTime() + 86400000) // +24h = próxima meia-noite SP (sem DST)
  }
  return out
}
function addDiasStr(dayStr: string, n: number): string {
  const { y, m, d } = spPartsOf(dayStr)
  return spDayStr(new Date(spMidnightUTC(y, m, d).getTime() + n * 86400000))
}

// ── Janela do período ────────────────────────────────────────
export interface Janela {
  inicioDay: string
  fimDay: string
  dias: string[]
  diasUteis: string[]
  inicioUTC: Date
  fimUTC: Date // exclusivo (fim do último dia)
}

function janelaDoPeriodo(periodo: PeriodoId, agora: Date): Janela {
  const hoje = spDayStr(agora)
  let inicioDay: string
  if (periodo === 'hoje') inicioDay = hoje
  else if (periodo === '7d') inicioDay = addDiasStr(hoje, -6)
  else if (periodo === '30d') inicioDay = addDiasStr(hoje, -29)
  else {
    const { y, m } = spPartsOf(hoje)
    inicioDay = `${y}-${pad(m)}-01`
  }
  return montarJanela(inicioDay, hoje)
}
function montarJanela(inicioDay: string, fimDay: string): Janela {
  const dias = listarDias(inicioDay, fimDay)
  const a = spPartsOf(inicioDay)
  const b = spPartsOf(fimDay)
  return {
    inicioDay,
    fimDay,
    dias,
    diasUteis: dias.filter(ehDiaUtil),
    inicioUTC: spMidnightUTC(a.y, a.m, a.d),
    fimUTC: new Date(spMidnightUTC(b.y, b.m, b.d).getTime() + 86400000),
  }
}
/** Janela imediatamente anterior, mesmo nº de dias. */
function janelaAnterior(j: Janela): Janela {
  const len = j.dias.length
  const prevFim = addDiasStr(j.inicioDay, -1)
  const prevInicio = addDiasStr(j.inicioDay, -len)
  return montarJanela(prevInicio, prevFim)
}

// ── Utilidades ───────────────────────────────────────────────
function dur(r: RawRegistro): number {
  if (!r.fim) return 0
  const s = (new Date(r.fim).getTime() - new Date(r.inicio).getTime()) / 1000
  return s > 0 ? s : 0
}
const horas = (seg: number) => +(seg / 3600).toFixed(2)

// ── Tipos de saída ───────────────────────────────────────────
export interface Kpi {
  valor: number
  anterior: number
  delta: number | null // variação relativa (ex.: 0.25 = +25%); null se base 0
}
export interface PainelData {
  periodo: PeriodoId
  periodoLabel: string
  intervaloLabel: string
  areaSelecionada: { id: string; nome: string } | null
  areas: { id: string; nome: string }[]
  diasUteis: number
  colabAtivos: number
  semDados: boolean

  kpis: {
    horas: Kpi
    registraram: Kpi & { total: number }
    adesao: Kpi // 0..1 (null delta se sem dias úteis)
    aderencia: Kpi // 0..100
    adesaoIndefinida: boolean
  }

  porCategoria: { nome: string; cor: string; horas: number; pct: number }[]
  porArea: { nome: string; horas: number; pct: number }[]
  carga: {
    temCapacidade: boolean
    linhas: {
      area: string
      pessoas: number
      capacidade: number
      carga: number
      util: number | null
      estado: 'pressao' | 'folga' | 'ok' | 'sem_capacidade'
    }[]
  }
  pessoas: PessoaLinha[]
  tendencia: { dia: string; label: string; horas: number; util: boolean }[]
  sinais: Sinal[]
  engajamento: { nome: string; moedas: number; estagio: string }[]
}

export interface PessoaLinha {
  id: string
  nome: string
  area: string | null
  cargo: string | null
  horas: number
  mix: { focado: number; reuniao: number; imprevisto: number; pausa: number; outros: number } // %
  aderencia: number | null // 0..100
  registrouHoje: boolean
  diasSemRegistrar: number | null // dias úteis desde o último registro (null se nunca)
  alertaFoco: boolean
}
export interface Sinal {
  tipo: 'pessoa_sem_registro' | 'area_pressao' | 'area_folga' | 'foco_baixo'
  severidade: 'alta' | 'media'
  texto: string
}

// chaves de categoria por nome (robusto a id)
function classificaCategoria(nome: string): keyof PessoaLinha['mix'] {
  const n = nome.toLowerCase()
  if (n.includes('focado')) return 'focado'
  if (n.includes('reuni')) return 'reuniao'
  if (n.includes('imprevisto') || n.includes('incêndio') || n.includes('incendio')) return 'imprevisto'
  if (n.includes('pausa') || n.includes('pessoal')) return 'pausa'
  return 'outros'
}

const LIMIAR_PRESSAO = 0.9
const LIMIAR_FOLGA = 0.55

// ── Cálculo principal ────────────────────────────────────────
export function computePainel(
  raw: {
    registros: RawRegistro[]
    pontuacoes: RawPontuacao[]
    profiles: RawProfile[]
    areas: RawArea[]
    categorias: RawCategoria[]
  },
  opts: { periodo: PeriodoId; areaId: string | null; agoraISO: string },
): PainelData {
  const agora = new Date(opts.agoraISO)
  const hojeStr = spDayStr(agora)
  const jat = janelaDoPeriodo(opts.periodo, agora)
  const jant = janelaAnterior(jat)

  const catById = new Map(raw.categorias.map(c => [c.id, c]))
  const areaById = new Map(raw.areas.map(a => [a.id, a]))
  const profById = new Map(raw.profiles.map(p => [p.id, p]))

  // Colaboradores ativos (role colaborador) — base do painel
  let colaboradores = raw.profiles.filter(p => p.role === 'colaborador' && p.ativo)
  if (opts.areaId) colaboradores = colaboradores.filter(p => p.area_id === opts.areaId)
  const colabIds = new Set(colaboradores.map(p => p.id))

  // registros dos colaboradores do escopo (qualquer usuário ativo do escopo)
  const noEscopo = (r: RawRegistro) => colabIds.has(r.user_id)

  function emJanela(r: RawRegistro, j: Janela) {
    const t = new Date(r.inicio).getTime()
    return t >= j.inicioUTC.getTime() && t < j.fimUTC.getTime()
  }

  // ----- métricas de uma janela (para KPI + comparação) -----
  function metricas(j: Janela) {
    const regs = raw.registros.filter(r => noEscopo(r) && emJanela(r, j))
    const segTotal = regs.reduce((a, r) => a + dur(r), 0)
    const registrantes = new Set(regs.map(r => r.user_id))
    // adesão (pares pessoa-dia útil com registro)
    const paresSet = new Set<string>()
    for (const r of regs) {
      const dia = spDayStr(new Date(r.inicio))
      if (j.diasUteis.includes(dia)) paresSet.add(`${r.user_id}::${dia}`)
    }
    const denom = colaboradores.length * j.diasUteis.length
    const adesao = denom > 0 ? paresSet.size / denom : null
    // aderência média (percentual das pontuações com data no período)
    const pts = raw.pontuacoes.filter(p => colabIds.has(p.user_id) && j.dias.includes(p.data))
    const aderencia = pts.length > 0 ? pts.reduce((a, p) => a + p.percentual, 0) / pts.length : null
    return { segTotal, registrantes: registrantes.size, adesao, aderencia, denom }
  }

  const mAtual = metricas(jat)
  const mAnt = metricas(jant)

  function kpi(v: number, ant: number): Kpi {
    return { valor: v, anterior: ant, delta: ant > 0 ? (v - ant) / ant : null }
  }

  const regsAtual = raw.registros.filter(r => noEscopo(r) && emJanela(r, jat))

  // ----- por categoria -----
  const catMap = new Map<string, number>()
  for (const r of regsAtual) catMap.set(r.categoria_id, (catMap.get(r.categoria_id) ?? 0) + dur(r))
  const totalCatSeg = [...catMap.values()].reduce((a, b) => a + b, 0)
  const porCategoria = [...catMap.entries()]
    .map(([id, seg]) => {
      const c = catById.get(id)
      return {
        nome: c?.nome ?? '—',
        cor: c?.cor ?? '#9CA3AF',
        horas: horas(seg),
        pct: totalCatSeg > 0 ? +((seg / totalCatSeg) * 100).toFixed(1) : 0,
      }
    })
    .filter(c => c.horas > 0)
    .sort((a, b) => b.horas - a.horas)

  // ----- por área (área = área do colaborador) -----
  const areaSegMap = new Map<string, number>()
  for (const r of regsAtual) {
    const p = profById.get(r.user_id)
    const key = p?.area_id ?? '__sem__'
    areaSegMap.set(key, (areaSegMap.get(key) ?? 0) + dur(r))
  }
  const totalAreaSeg = [...areaSegMap.values()].reduce((a, b) => a + b, 0)
  const porArea = [...areaSegMap.entries()]
    .map(([key, seg]) => ({
      nome: key === '__sem__' ? 'Sem área' : areaById.get(key)?.nome ?? '—',
      horas: horas(seg),
      pct: totalAreaSeg > 0 ? +((seg / totalAreaSeg) * 100).toFixed(1) : 0,
    }))
    .filter(a => a.horas > 0)
    .sort((a, b) => b.horas - a.horas)

  // ----- carga × capacidade (por área cadastrada) -----
  const areasParaCarga = opts.areaId ? raw.areas.filter(a => a.id === opts.areaId) : raw.areas
  const cargaLinhas = areasParaCarga
    .map(area => {
      const pessoasArea = colaboradores.filter(p => p.area_id === area.id)
      const capacidadeH = pessoasArea.reduce(
        (a, p) => a + p.horas_dia_contratadas * jat.diasUteis.length,
        0,
      )
      const cargaSeg = regsAtual
        .filter(r => profById.get(r.user_id)?.area_id === area.id)
        .reduce((a, r) => a + dur(r), 0)
      const cargaH = horas(cargaSeg)
      const util = capacidadeH > 0 ? cargaH / capacidadeH : null
      let estado: 'pressao' | 'folga' | 'ok' | 'sem_capacidade'
      if (util === null) estado = 'sem_capacidade'
      else if (util >= LIMIAR_PRESSAO) estado = 'pressao'
      else if (util <= LIMIAR_FOLGA) estado = 'folga'
      else estado = 'ok'
      return {
        area: area.nome,
        pessoas: pessoasArea.length,
        capacidade: +capacidadeH.toFixed(1),
        carga: cargaH,
        util,
        estado,
      }
    })
    .filter(l => l.pessoas > 0 || l.carga > 0)
    .sort((a, b) => (b.util ?? -1) - (a.util ?? -1))
  const temCapacidade = cargaLinhas.some(l => l.capacidade > 0)

  // ----- último registro por pessoa (qualquer data na base carregada) -----
  const ultimoDiaPorUser = new Map<string, string>()
  for (const r of raw.registros) {
    if (!colabIds.has(r.user_id)) continue
    const dia = spDayStr(new Date(r.inicio))
    const atual = ultimoDiaPorUser.get(r.user_id)
    if (!atual || dia > atual) ultimoDiaPorUser.set(r.user_id, dia)
  }
  function diasUteisEntre(deDia: string, ateDia: string): number {
    if (deDia >= ateDia) return 0
    let count = 0
    let cur = addDiasStr(deDia, 1)
    while (cur <= ateDia) {
      if (ehDiaUtil(cur)) count++
      cur = addDiasStr(cur, 1)
    }
    return count
  }

  // ----- pessoas -----
  const pessoas: PessoaLinha[] = colaboradores
    .map(p => {
      const regs = regsAtual.filter(r => r.user_id === p.id)
      const seg = regs.reduce((a, r) => a + dur(r), 0)
      const mixSeg = { focado: 0, reuniao: 0, imprevisto: 0, pausa: 0, outros: 0 }
      for (const r of regs) {
        const c = catById.get(r.categoria_id)
        mixSeg[classificaCategoria(c?.nome ?? '')] += dur(r)
      }
      const somaMix = Object.values(mixSeg).reduce((a, b) => a + b, 0)
      const mix = {
        focado: somaMix > 0 ? Math.round((mixSeg.focado / somaMix) * 100) : 0,
        reuniao: somaMix > 0 ? Math.round((mixSeg.reuniao / somaMix) * 100) : 0,
        imprevisto: somaMix > 0 ? Math.round((mixSeg.imprevisto / somaMix) * 100) : 0,
        pausa: somaMix > 0 ? Math.round((mixSeg.pausa / somaMix) * 100) : 0,
        outros: somaMix > 0 ? Math.round((mixSeg.outros / somaMix) * 100) : 0,
      }
      const pts = raw.pontuacoes.filter(x => x.user_id === p.id && jat.dias.includes(x.data))
      const aderencia = pts.length > 0 ? Math.round(pts.reduce((a, x) => a + x.percentual, 0) / pts.length) : null
      const ultimoDia = ultimoDiaPorUser.get(p.id) ?? null
      const registrouHoje = ultimoDia === hojeStr
      const diasSemRegistrar = ultimoDia ? diasUteisEntre(ultimoDia, hojeStr) : null
      const alertaFoco = somaMix >= 3600 && mix.imprevisto + mix.reuniao >= 50 && mix.focado <= 20
      return {
        id: p.id,
        nome: p.sobrenome ? `${p.nome} ${p.sobrenome}` : p.nome,
        area: p.area_id ? areaById.get(p.area_id)?.nome ?? null : null,
        cargo: p.cargo,
        horas: horas(seg),
        mix,
        aderencia,
        registrouHoje,
        diasSemRegistrar,
        alertaFoco,
      }
    })
    .sort((a, b) => b.horas - a.horas)

  // ----- tendência -----
  const segPorDia = new Map<string, number>()
  for (const r of regsAtual) {
    const dia = spDayStr(new Date(r.inicio))
    segPorDia.set(dia, (segPorDia.get(dia) ?? 0) + dur(r))
  }
  const tendencia = jat.dias.map(dia => {
    const { d, m } = spPartsOf(dia)
    return {
      dia,
      label: `${pad(d)}/${pad(m)}`,
      horas: horas(segPorDia.get(dia) ?? 0),
      util: ehDiaUtil(dia),
    }
  })

  // ----- sinais de atenção -----
  const sinais: Sinal[] = []
  for (const p of pessoas) {
    if (p.diasSemRegistrar === null) {
      sinais.push({ tipo: 'pessoa_sem_registro', severidade: 'media', texto: `${p.nome} ainda não registrou nenhuma jornada.` })
    } else if (!p.registrouHoje && p.diasSemRegistrar >= 2) {
      sinais.push({
        tipo: 'pessoa_sem_registro',
        severidade: 'alta',
        texto: `${p.nome} não registra há ${p.diasSemRegistrar} dias úteis.`,
      })
    } else if (!p.registrouHoje && ehDiaUtil(hojeStr)) {
      sinais.push({ tipo: 'pessoa_sem_registro', severidade: 'media', texto: `${p.nome} ainda não registrou hoje.` })
    }
  }
  for (const l of cargaLinhas) {
    if (l.estado === 'pressao') sinais.push({ tipo: 'area_pressao', severidade: 'alta', texto: `${l.area} sob pressão — utilização em ${Math.round((l.util ?? 0) * 100)}%.` })
    if (l.estado === 'folga') sinais.push({ tipo: 'area_folga', severidade: 'media', texto: `${l.area} com folga — utilização em ${Math.round((l.util ?? 0) * 100)}%.` })
  }
  for (const p of pessoas) {
    if (p.alertaFoco) sinais.push({ tipo: 'foco_baixo', severidade: 'media', texto: `${p.nome} concentrou tempo em reuniões/imprevistos e pouco em trabalho focado.` })
  }
  // ordena por severidade
  sinais.sort((a, b) => (a.severidade === 'alta' ? 0 : 1) - (b.severidade === 'alta' ? 0 : 1))

  // ----- engajamento (dragões) -----
  const engajamento = colaboradores
    .map(p => ({ nome: p.sobrenome ? `${p.nome} ${p.sobrenome}` : p.nome, moedas: p.moedas }))
    .sort((a, b) => b.moedas - a.moedas)
    .slice(0, 6)
    .map(x => ({ ...x, estagio: estagioNome(x.moedas) }))

  const intervaloLabel =
    jat.inicioDay === jat.fimDay
      ? rotuloData(jat.fimDay)
      : `${rotuloData(jat.inicioDay)} – ${rotuloData(jat.fimDay)}`

  return {
    periodo: opts.periodo,
    periodoLabel: PERIODOS.find(p => p.id === opts.periodo)?.label ?? '',
    intervaloLabel,
    areaSelecionada: opts.areaId ? { id: opts.areaId, nome: areaById.get(opts.areaId)?.nome ?? '—' } : null,
    areas: raw.areas.map(a => ({ id: a.id, nome: a.nome })),
    diasUteis: jat.diasUteis.length,
    colabAtivos: colaboradores.length,
    semDados: regsAtual.length === 0,
    kpis: {
      horas: kpi(horas(mAtual.segTotal), horas(mAnt.segTotal)),
      registraram: { ...kpi(mAtual.registrantes, mAnt.registrantes), total: colaboradores.length },
      adesao: {
        valor: mAtual.adesao ?? 0,
        anterior: mAnt.adesao ?? 0,
        delta: mAnt.adesao && mAnt.adesao > 0 && mAtual.adesao !== null ? (mAtual.adesao - mAnt.adesao) / mAnt.adesao : null,
      },
      aderencia: {
        valor: mAtual.aderencia ?? 0,
        anterior: mAnt.aderencia ?? 0,
        delta: mAnt.aderencia && mAnt.aderencia > 0 && mAtual.aderencia !== null ? (mAtual.aderencia - mAnt.aderencia) / mAnt.aderencia : null,
      },
      adesaoIndefinida: mAtual.denom === 0,
    },
    porCategoria,
    porArea,
    carga: { temCapacidade, linhas: cargaLinhas },
    pessoas,
    tendencia,
    sinais,
    engajamento,
  }
}

// estágio do dragão (espelha src/lib/dragao.ts; mantido aqui para o servidor)
function estagioNome(moedas: number): string {
  const m = Math.max(0, Math.round(moedas || 0))
  if (m === 0) return 'Ovo'
  if (m <= 9) return 'Bebê'
  if (m <= 24) return 'Filhote'
  if (m <= 49) return 'Jovem'
  return 'Adulto'
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function rotuloData(dayStr: string): string {
  const { d, m } = spPartsOf(dayStr)
  return `${d} ${MESES[m - 1]}`
}
