import { parseISO, differenceInSeconds, format, subDays, startOfDay } from 'date-fns'

// ───────────────────────────────────────────────────────────
// Regras de gamificação (ajuste os números aqui se quiser)
// ───────────────────────────────────────────────────────────
export const META_PCT = 0.8          // 80% das horas contratadas
export const MOEDAS_BASE = 10        // moedas por dia que bate a meta
export const MOEDAS_BONUS_DIA = 5    // +moedas por dia consecutivo (ofensiva)
export const MOEDAS_BONUS_MAX = 25   // teto do bônus de ofensiva

export interface Nivel {
  nome: string
  emoji: string
  min: number
  max: number | null
  cor: string    // classe de texto
  corBg: string  // classe de fundo
  corRing: string // cor do anel (hex)
}

export const NIVEIS: Nivel[] = [
  { nome: 'Bronze',   emoji: '🥉', min: 0,    max: 99,   cor: 'text-amber-700',  corBg: 'bg-amber-100',  corRing: '#b45309' },
  { nome: 'Prata',    emoji: '🥈', min: 100,  max: 299,  cor: 'text-slate-600',  corBg: 'bg-slate-100',  corRing: '#475569' },
  { nome: 'Ouro',     emoji: '🥇', min: 300,  max: 699,  cor: 'text-yellow-700', corBg: 'bg-yellow-100', corRing: '#a16207' },
  { nome: 'Platina',  emoji: '💎', min: 700,  max: 1499, cor: 'text-cyan-700',   corBg: 'bg-cyan-100',   corRing: '#0e7490' },
  { nome: 'Diamante', emoji: '👑', min: 1500, max: null, cor: 'text-indigo-700', corBg: 'bg-indigo-100', corRing: '#4338ca' },
]

/**
 * Faixa/nível a partir de um saldo de moedas autoritativo (profiles.moedas).
 * Usar isto em vez de recalcular pontuação no cliente.
 */
export function nivelDe(moedas: number): {
  nivel: Nivel
  proximoNivel: Nivel | null
  faltaProxNivel: number
  progressoNivel: number
} {
  const total = Math.max(0, Math.round(moedas || 0))
  const nivel =
    NIVEIS.find(n => total >= n.min && (n.max === null || total <= n.max)) ?? NIVEIS[0]
  const idx = NIVEIS.indexOf(nivel)
  const proximoNivel = idx < NIVEIS.length - 1 ? NIVEIS[idx + 1] : null
  const faltaProxNivel = proximoNivel ? proximoNivel.min - total : 0
  const progressoNivel = proximoNivel
    ? (total - nivel.min) / (proximoNivel.min - nivel.min)
    : 1
  return { nivel, proximoNivel, faltaProxNivel, progressoNivel }
}

export interface DiaResumo {
  data: string // 'yyyy-MM-dd'
  segundos: number
  meta: number
  bateuMeta: boolean
  moedas: number
}

export interface Estatisticas {
  meta: number              // meta diária em segundos
  totalMoedas: number
  streakAtual: number
  melhorStreak: number
  diasQualificados: number
  nivel: Nivel
  proximoNivel: Nivel | null
  faltaProxNivel: number
  progressoNivel: number    // 0..1
  hojeSegundos: number
  hojeBateuMeta: boolean
  hojePct: number           // pode passar de 1
  moedasHoje: number        // já conquistadas hoje
  moedasHojePotencial: number // o que ganha ao bater a meta hoje (projetando ofensiva)
  mapaDias: Map<string, DiaResumo>
}

type RegistroLeve = { inicio: string; fim: string | null }

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function ehFimDeSemana(d: Date): boolean {
  const dia = d.getDay()
  return dia === 0 || dia === 6
}

/** Dia útil imediatamente anterior (pula sábado e domingo). */
export function diaUtilAnterior(d: Date): Date {
  let x = subDays(startOfDay(d), 1)
  while (ehFimDeSemana(x)) x = subDays(x, 1)
  return x
}

/** Últimos N dias úteis terminando em `ref` (inclusive se ref for dia útil). */
export function ultimosDiasUteis(n: number, ref: Date): Date[] {
  const arr: Date[] = []
  let d = startOfDay(ref)
  while (arr.length < n) {
    if (!ehFimDeSemana(d)) arr.unshift(d)
    d = subDays(d, 1)
  }
  return arr
}

function segundosRegistro(r: RegistroLeve, agora: Date): number {
  const fim = r.fim ? parseISO(r.fim) : agora
  return Math.max(0, differenceInSeconds(fim, parseISO(r.inicio)))
}

function moedasPorRun(run: number): number {
  return MOEDAS_BASE + Math.min((run - 1) * MOEDAS_BONUS_DIA, MOEDAS_BONUS_MAX)
}

export function calcularEstatisticas(
  registros: RegistroLeve[],
  horasContratadas: number,
  agora: Date,
): Estatisticas {
  const meta = Math.max(0.5, horasContratadas || 8) * 3600 * META_PCT

  // Agrupa segundos por dia local
  const porDia = new Map<string, number>()
  for (const r of registros) {
    if (!r.inicio) continue
    const dia = format(parseISO(r.inicio), 'yyyy-MM-dd')
    porDia.set(dia, (porDia.get(dia) ?? 0) + segundosRegistro(r, agora))
  }

  const diasOrdenados = [...porDia.keys()].sort()
  const qualSet = new Set<string>()
  for (const [dia, seg] of porDia) if (seg >= meta) qualSet.add(dia)

  // Caminha cronologicamente acumulando moedas e ofensiva
  const runByDay = new Map<string, number>()
  const mapaDias = new Map<string, DiaResumo>()
  let totalMoedas = 0
  let melhorStreak = 0

  for (const dia of diasOrdenados) {
    const seg = porDia.get(dia)!
    const bateu = seg >= meta
    let moedas = 0
    if (bateu) {
      const prev = ymd(diaUtilAnterior(parseISO(dia + 'T00:00:00')))
      const run = (qualSet.has(prev) ? runByDay.get(prev) ?? 0 : 0) + 1
      runByDay.set(dia, run)
      moedas = moedasPorRun(run)
      totalMoedas += moedas
      melhorStreak = Math.max(melhorStreak, run)
    }
    mapaDias.set(dia, { data: dia, segundos: seg, meta, bateuMeta: bateu, moedas })
  }

  const hojeStr = ymd(agora)
  const hojeSegundos = porDia.get(hojeStr) ?? 0
  const hojeBateuMeta = hojeSegundos >= meta
  const hojePct = meta > 0 ? hojeSegundos / meta : 0

  // Ofensiva atual
  let streakAtual: number
  if (hojeBateuMeta) {
    streakAtual = runByDay.get(hojeStr) ?? 1
  } else {
    const prev = ymd(diaUtilAnterior(agora))
    streakAtual = qualSet.has(prev) ? runByDay.get(prev) ?? 0 : 0
  }

  // Moedas de hoje (conquistadas ou potenciais)
  const moedasHoje = hojeBateuMeta ? mapaDias.get(hojeStr)?.moedas ?? 0 : 0
  let moedasHojePotencial: number
  if (hojeBateuMeta) {
    moedasHojePotencial = moedasHoje
  } else {
    const prev = ymd(diaUtilAnterior(agora))
    const runProj = (qualSet.has(prev) ? runByDay.get(prev) ?? 0 : 0) + 1
    moedasHojePotencial = moedasPorRun(runProj)
  }

  const nivel =
    NIVEIS.find(n => totalMoedas >= n.min && (n.max === null || totalMoedas <= n.max)) ?? NIVEIS[0]
  const idx = NIVEIS.indexOf(nivel)
  const proximoNivel = idx < NIVEIS.length - 1 ? NIVEIS[idx + 1] : null
  const faltaProxNivel = proximoNivel ? proximoNivel.min - totalMoedas : 0
  const progressoNivel = proximoNivel
    ? (totalMoedas - nivel.min) / (proximoNivel.min - nivel.min)
    : 1

  return {
    meta,
    totalMoedas,
    streakAtual,
    melhorStreak,
    diasQualificados: qualSet.size,
    nivel,
    proximoNivel,
    faltaProxNivel,
    progressoNivel,
    hojeSegundos,
    hojeBateuMeta,
    hojePct,
    moedasHoje,
    moedasHojePotencial,
    mapaDias,
  }
}
