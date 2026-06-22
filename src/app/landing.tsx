import Link from 'next/link'
import { Fraunces } from 'next/font/google'
import DragaoSVG from '@/components/dragao-svg'
import { ESTAGIOS_DRAGAO } from '@/lib/dragao'

// Display serif — caloroso e editorial, usado com parcimônia nos títulos.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
})

// ── Assinatura da marca: barra 80/20 (os 20% que geram 80%) ──────────
function Barra8020({ className = '', claro = false }: { className?: string; claro?: boolean }) {
  return (
    <div className={`flex h-1.5 w-28 overflow-hidden rounded-full ${className}`} aria-hidden="true">
      <div className={`w-4/5 ${claro ? 'bg-white/25' : 'bg-indigo-100'}`} />
      <div className="w-1/5 bg-emerald-400" />
    </div>
  )
}

function Eyebrow({ children, tom = 'indigo' }: { children: React.ReactNode; tom?: 'indigo' | 'emerald' }) {
  const cor = tom === 'emerald' ? 'text-emerald-600' : 'text-indigo-600'
  return (
    <div className={`flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${cor}`}>
      <span className="h-px w-6 bg-current opacity-40" />
      {children}
    </div>
  )
}

// ── Ícones de linha (3 cards) ────────────────────────────────────────
function IconeTempo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
function IconeTarefa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M9 5h6M12 3v2" />
      <circle cx="12" cy="14" r="7" />
      <path d="M12 14l3-2" />
    </svg>
  )
}
function IconeTime() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-3-4.9" />
    </svg>
  )
}

const ENXERGA = [
  { icone: IconeTempo, titulo: 'Onde vai o tempo', texto: 'Cada área e cada pessoa, com transparência.' },
  { icone: IconeTarefa, titulo: 'Quanto leva cada tarefa', texto: 'O tempo real de cada atividade, do e-mail ao fechamento.' },
  { icone: IconeTime, titulo: 'O time no tamanho certo', texto: 'Onde falta gente e onde sobra.' },
]

const PASSOS = [
  { n: '01', titulo: 'Registre', texto: 'Marque o que está fazendo, em blocos, ao longo do dia.' },
  { n: '02', titulo: 'O Pareto organiza', texto: 'Tudo vira dado por área, categoria e projeto.' },
  { n: '03', titulo: 'Acompanhe', texto: 'Relatórios para a liderança, progresso para você.' },
]

function BotaoEntrar({ variante = 'solido' }: { variante?: 'solido' | 'claro' }) {
  const base =
    'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400'
  const estilo =
    variante === 'claro'
      ? 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm shadow-indigo-900/10 focus-visible:ring-offset-indigo-700'
      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/25'
  return (
    <Link href="/login" className={`${base} ${estilo}`}>
      Entrar
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4" aria-hidden="true">
        <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 text-gray-900">
      {/* ── Nav ── */}
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <span className={`${fraunces.className} text-2xl font-semibold tracking-tight text-white`}>Pareto</span>
          <BotaoEntrar variante="claro" />
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-900 text-white">
        {/* brilho ambiente sutil */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8 sm:pb-32 sm:pt-44">
          <div className="max-w-3xl">
            <Eyebrow tom="emerald">Inteligência de jornada</Eyebrow>
            <h1 className={`${fraunces.className} mt-6 text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl`}>
              Clareza sobre o trabalho
              <br className="hidden sm:block" /> que sustenta a operação.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-indigo-100/90">
              O Pareto registra a rotina das áreas administrativas e transforma o dia a dia em
              informação: onde o tempo vai, quanto cada tarefa leva e como dimensionar cada time.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <BotaoEntrar variante="claro" />
            </div>

            <div className="mt-12 flex items-center gap-3 text-sm text-indigo-200/80">
              <Barra8020 claro />
              <span>Do princípio 80/20 — enxergar os 20% que geram 80% do resultado.</span>
            </div>
          </div>
        </div>

        {/* curva inferior suave para a seção branca */}
        <div aria-hidden="true" className="h-10 bg-gray-50" style={{ borderTopLeftRadius: '2.5rem', borderTopRightRadius: '2.5rem' }} />
      </section>

      {/* ── O que o Pareto enxerga ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <Eyebrow>O que o Pareto enxerga</Eyebrow>
          <h2 className={`${fraunces.className} mt-5 text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl`}>
            Três perguntas, uma resposta clara.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {ENXERGA.map(({ icone: Icone, titulo, texto }) => (
            <article
              key={titulo}
              className="group rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <Icone />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">{titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{texto}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Simples no dia a dia ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <Eyebrow>Simples no dia a dia</Eyebrow>
            <h2 className={`${fraunces.className} mt-5 text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl`}>
              Sem fricção para quem registra.
            </h2>
          </div>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-gray-100 bg-gray-100 sm:grid-cols-3">
            {PASSOS.map(({ n, titulo, texto }) => (
              <li key={n} className="bg-white p-7 sm:p-8">
                <span className={`${fraunces.className} text-3xl font-medium text-indigo-200`}>{n}</span>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Seu esforço vira progresso (dragão) ── */}
      <section className="bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
          <div>
            <Eyebrow tom="emerald">Seu esforço vira progresso</Eyebrow>
            <h2 className={`${fraunces.className} mt-5 text-3xl font-medium tracking-tight text-emerald-950 sm:text-4xl`}>
              Consistência que aparece.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-emerald-900/80">
              Registrar o dia completo, todos os dias, faz seu dragão crescer — do ovo ao adulto.
              Uma forma leve de ver, em um relance, quem mantém a rotina em dia.
            </p>
            <div className="mt-8">
              <Barra8020 />
            </div>
          </div>

          {/* Progressão ovo → adulto */}
          <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white/70 p-5 shadow-sm backdrop-blur-sm sm:p-6">
            <div className="flex items-end justify-between gap-1.5 sm:gap-2">
              {ESTAGIOS_DRAGAO.map((e, i) => (
                <div key={e.chave} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <DragaoSVG
                    estagio={e.chave}
                    asas={e.chave === 'adulto'}
                    size={24 + i * 8}
                  />
                  <span className="w-full truncate text-center text-[11px] font-medium text-emerald-700">{e.nome}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-emerald-100 pt-4 text-xs text-emerald-700/70">
              <span aria-hidden="true">🪙</span>
              <span>Cada dia completo aproxima o próximo estágio.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Rodapé / CTA ── */}
      <footer className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <span className={`${fraunces.className} text-2xl font-semibold tracking-tight`}>Pareto</span>
            <p className="mt-2 max-w-sm text-sm text-gray-400">
              Clareza sobre o trabalho que sustenta a operação.
            </p>
          </div>
          <BotaoEntrar variante="claro" />
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-gray-500 sm:px-8">
            © {2026} Pareto · Do princípio 80/20.
          </div>
        </div>
      </footer>
    </div>
  )
}
