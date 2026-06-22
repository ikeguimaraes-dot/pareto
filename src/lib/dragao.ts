// ───────────────────────────────────────────────────────────
// Dragão da consistência — puramente cosmético.
// O estágio deriva do saldo autoritativo profiles.moedas; nada
// é recalculado aqui além do mapeamento saldo → estágio.
// ───────────────────────────────────────────────────────────

export type EstagioChave = 'ovo' | 'bebe' | 'filhote' | 'jovem' | 'adulto'

export interface EstagioDragao {
  chave: EstagioChave
  nome: string
  min: number
  max: number | null
  descricao: string
}

// Faixas pedidas: 0 = Ovo, 1–9 = Bebê, 10–24 = Filhote, 25–49 = Jovem, 50+ = Adulto
export const ESTAGIOS_DRAGAO: EstagioDragao[] = [
  { chave: 'ovo',     nome: 'Ovo',     min: 0,  max: 0,    descricao: 'Tudo começa aqui. Registre seu dia para chocar o ovo.' },
  { chave: 'bebe',    nome: 'Bebê',    min: 1,  max: 9,    descricao: 'Seu dragão nasceu! Bata a meta para ele crescer.' },
  { chave: 'filhote', nome: 'Filhote', min: 10, max: 24,   descricao: 'Crescendo rápido e já dando os primeiros saltos.' },
  { chave: 'jovem',   nome: 'Jovem',   min: 25, max: 49,   descricao: 'Forte e confiante. Falta pouco para a forma adulta.' },
  { chave: 'adulto',  nome: 'Adulto',  min: 50, max: null, descricao: 'Um dragão imponente. Mantenha a consistência.' },
]

export function estagioDragao(moedas: number): EstagioDragao {
  const m = Math.max(0, Math.round(moedas || 0))
  return (
    ESTAGIOS_DRAGAO.find(e => m >= e.min && (e.max === null || m <= e.max)) ??
    ESTAGIOS_DRAGAO[0]
  )
}

/** Quantas moedas faltam para o próximo estágio (null se já é adulto). */
export function faltaProximoEstagio(moedas: number): { proximo: EstagioDragao; falta: number } | null {
  const atual = estagioDragao(moedas)
  const idx = ESTAGIOS_DRAGAO.indexOf(atual)
  const proximo = ESTAGIOS_DRAGAO[idx + 1]
  if (!proximo) return null
  return { proximo, falta: Math.max(0, proximo.min - Math.round(moedas || 0)) }
}

// Asas (overlay): entre os últimos 30 dias avaliados, ao menos 20 com
// bateu_meta=true E existirem ao menos 30 dias avaliados.
export const ASAS_JANELA = 30
export const ASAS_MINIMO = 20

export function temAsas(diasAvaliados: { bateu_meta: boolean }[]): boolean {
  if (diasAvaliados.length < ASAS_JANELA) return false
  const janela = diasAvaliados.slice(0, ASAS_JANELA)
  const batidos = janela.filter(d => d.bateu_meta).length
  return batidos >= ASAS_MINIMO
}
