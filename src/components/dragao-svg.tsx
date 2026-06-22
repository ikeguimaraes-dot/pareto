import type { EstagioChave } from '@/lib/dragao'

interface Props {
  estagio: EstagioChave
  asas?: boolean
  size?: number
  className?: string
}

// Paleta compartilhada entre estágios para o dragão parecer "o mesmo" crescendo.
const VERDE_CLARO = '#6ee7b7'
const VERDE = '#34d399'
const VERDE_ESCURO = '#059669'
const BARRIGA = '#fef9c3'
const CHIFRE = '#fbbf24'
const CASCA = '#fde68a'

/** Asas de morcego/dragão, renderizadas atrás do corpo. */
function Asas({ y = 64, spread = 1 }: { y?: number; spread?: number }) {
  const dx = 26 * spread
  return (
    <g opacity={0.95}>
      {/* asa esquerda */}
      <path
        d={`M70 ${y} C ${70 - dx} ${y - 30}, ${70 - dx - 14} ${y - 6}, ${70 - dx - 8} ${y + 14}
           C ${70 - dx + 2} ${y + 6}, ${70 - dx + 10} ${y + 10}, 70 ${y + 6} Z`}
        fill="#a7f3d0"
        stroke={VERDE_ESCURO}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* asa direita (espelhada) */}
      <path
        d={`M70 ${y} C ${70 + dx} ${y - 30}, ${70 + dx + 14} ${y - 6}, ${70 + dx + 8} ${y + 14}
           C ${70 + dx - 2} ${y + 6}, ${70 + dx - 10} ${y + 10}, 70 ${y + 6} Z`}
        fill="#a7f3d0"
        stroke={VERDE_ESCURO}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </g>
  )
}

function Olhos({ cx = 70, cy = 70, r = 5, gap = 12 }: { cx?: number; cy?: number; r?: number; gap?: number }) {
  return (
    <g>
      <circle cx={cx - gap} cy={cy} r={r} fill="#fff" />
      <circle cx={cx + gap} cy={cy} r={r} fill="#fff" />
      <circle cx={cx - gap + 1} cy={cy + 1} r={r * 0.5} fill="#1f2937" />
      <circle cx={cx + gap + 1} cy={cy + 1} r={r * 0.5} fill="#1f2937" />
      <circle cx={cx - gap + 2.5} cy={cy - 1} r={r * 0.18} fill="#fff" />
      <circle cx={cx + gap + 2.5} cy={cy - 1} r={r * 0.18} fill="#fff" />
    </g>
  )
}

function Ovo() {
  return (
    <g>
      <ellipse cx="70" cy="78" rx="34" ry="42" fill={CASCA} stroke={CHIFRE} strokeWidth="2.5" />
      <ellipse cx="70" cy="78" rx="34" ry="42" fill="url(#ovoBrilho)" />
      {/* manchas */}
      <circle cx="56" cy="66" r="6" fill={VERDE} opacity="0.85" />
      <circle cx="82" cy="84" r="8" fill={VERDE} opacity="0.85" />
      <circle cx="64" cy="98" r="5" fill={VERDE} opacity="0.85" />
      {/* rachadura sutil */}
      <path d="M58 50 l8 8 l-6 6 l9 7" fill="none" stroke={VERDE_ESCURO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function Bebe() {
  return (
    <g>
      {/* casca embaixo, como se tivesse acabado de nascer */}
      <path d="M44 104 q26 14 52 0 l-4 12 q-22 9 -44 0 Z" fill={CASCA} stroke={CHIFRE} strokeWidth="2" strokeLinejoin="round" />
      {/* corpo redondinho */}
      <circle cx="70" cy="74" r="30" fill="url(#corpo)" stroke={VERDE_ESCURO} strokeWidth="2.5" />
      <ellipse cx="70" cy="86" rx="16" ry="13" fill={BARRIGA} />
      {/* chifrinhos */}
      <path d="M58 48 l-3 -9 l8 5 Z" fill={CHIFRE} />
      <path d="M82 48 l3 -9 l-8 5 Z" fill={CHIFRE} />
      <Olhos cy={70} />
      {/* bochechas */}
      <circle cx="52" cy="80" r="4" fill="#fca5a5" opacity="0.7" />
      <circle cx="88" cy="80" r="4" fill="#fca5a5" opacity="0.7" />
      {/* sorriso */}
      <path d="M64 84 q6 6 12 0" fill="none" stroke={VERDE_ESCURO} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function Filhote() {
  return (
    <g>
      {/* cauda */}
      <path d="M96 96 q22 4 18 22 q-8 -6 -14 -4" fill={VERDE} stroke={VERDE_ESCURO} strokeWidth="2.5" strokeLinejoin="round" />
      {/* corpo */}
      <ellipse cx="68" cy="84" rx="28" ry="26" fill="url(#corpo)" stroke={VERDE_ESCURO} strokeWidth="2.5" />
      <ellipse cx="68" cy="92" rx="15" ry="14" fill={BARRIGA} />
      {/* espinhos das costas */}
      <path d="M46 70 l-6 -7 l9 1 Z" fill={VERDE_ESCURO} />
      <path d="M56 62 l-4 -9 l9 3 Z" fill={VERDE_ESCURO} />
      {/* cabeça */}
      <circle cx="70" cy="58" r="22" fill="url(#corpo)" stroke={VERDE_ESCURO} strokeWidth="2.5" />
      <path d="M60 40 l-3 -10 l9 6 Z" fill={CHIFRE} />
      <path d="M80 40 l3 -10 l-9 6 Z" fill={CHIFRE} />
      <Olhos cx={70} cy={56} r={5} gap={11} />
      <ellipse cx="70" cy="66" rx="9" ry="6" fill={VERDE_CLARO} />
      <circle cx="66" cy="66" r="1.4" fill={VERDE_ESCURO} />
      <circle cx="74" cy="66" r="1.4" fill={VERDE_ESCURO} />
      <path d="M64 70 q6 4 12 0" fill="none" stroke={VERDE_ESCURO} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  )
}

function Jovem() {
  return (
    <g>
      {/* cauda comprida com ponta */}
      <path d="M92 104 q26 8 22 30 l-7 -3 l-2 7 q-10 -16 -22 -22" fill={VERDE} stroke={VERDE_ESCURO} strokeWidth="2.5" strokeLinejoin="round" />
      {/* pernas */}
      <ellipse cx="56" cy="112" rx="8" ry="10" fill={VERDE_ESCURO} />
      <ellipse cx="78" cy="112" rx="8" ry="10" fill={VERDE_ESCURO} />
      {/* corpo ereto */}
      <path d="M50 104 q-4 -34 20 -44 q24 10 20 44 Z" fill="url(#corpo)" stroke={VERDE_ESCURO} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="70" cy="92" rx="14" ry="18" fill={BARRIGA} />
      {/* espinhos dorsais */}
      <path d="M70 50 l5 -8 l5 9 l6 -6 l3 9" fill="none" stroke={VERDE_ESCURO} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* cabeça erguida */}
      <ellipse cx="68" cy="46" rx="21" ry="19" fill="url(#corpo)" stroke={VERDE_ESCURO} strokeWidth="2.5" />
      <path d="M58 30 l-4 -12 l10 7 Z" fill={CHIFRE} />
      <path d="M80 30 l4 -12 l-10 7 Z" fill={CHIFRE} />
      {/* focinho */}
      <ellipse cx="74" cy="52" rx="13" ry="9" fill={VERDE_CLARO} />
      <circle cx="80" cy="50" r="1.6" fill={VERDE_ESCURO} />
      <circle cx="84" cy="52" r="1.6" fill={VERDE_ESCURO} />
      <Olhos cx={66} cy={44} r={4.5} gap={10} />
      <path d="M70 56 q7 4 13 -1" fill="none" stroke={VERDE_ESCURO} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  )
}

function Adulto() {
  return (
    <g>
      {/* cauda majestosa */}
      <path d="M88 108 q34 6 30 34 l-8 -4 l-3 8 q-12 -20 -28 -26" fill={VERDE} stroke={VERDE_ESCURO} strokeWidth="3" strokeLinejoin="round" />
      <path d="M114 142 l8 -4 l-3 8 Z" fill={CHIFRE} />
      {/* pernas robustas */}
      <ellipse cx="52" cy="114" rx="10" ry="12" fill={VERDE_ESCURO} />
      <ellipse cx="82" cy="114" rx="10" ry="12" fill={VERDE_ESCURO} />
      {/* peito largo */}
      <path d="M44 110 q-6 -40 26 -50 q32 10 26 50 Z" fill="url(#corpo)" stroke={VERDE_ESCURO} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="70" cy="94" rx="16" ry="22" fill={BARRIGA} />
      <path d="M62 84 h16 M60 94 h20 M62 104 h16" stroke={CHIFRE} strokeWidth="1.4" opacity="0.5" strokeLinecap="round" />
      {/* crista dorsal */}
      <path d="M70 44 l6 -10 l5 11 l7 -7 l4 11 l7 -5" fill="none" stroke={VERDE_ESCURO} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* cabeça imponente erguida */}
      <ellipse cx="66" cy="40" rx="23" ry="20" fill="url(#corpo)" stroke={VERDE_ESCURO} strokeWidth="3" />
      <path d="M54 22 l-5 -14 l12 8 Z" fill={CHIFRE} stroke={VERDE_ESCURO} strokeWidth="1" />
      <path d="M80 22 l5 -14 l-12 8 Z" fill={CHIFRE} stroke={VERDE_ESCURO} strokeWidth="1" />
      {/* focinho com narina e brilho */}
      <ellipse cx="74" cy="48" rx="15" ry="10" fill={VERDE_CLARO} />
      <circle cx="82" cy="46" r="1.8" fill={VERDE_ESCURO} />
      <circle cx="86" cy="48" r="1.8" fill={VERDE_ESCURO} />
      <path d="M88 44 q6 -2 9 2" fill="none" stroke={CHIFRE} strokeWidth="2.5" strokeLinecap="round" />
      <Olhos cx={64} cy={38} r={4.5} gap={11} />
      <path d="M70 54 q9 4 16 -2" fill="none" stroke={VERDE_ESCURO} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

const RENDER: Record<EstagioChave, () => React.JSX.Element> = {
  ovo: Ovo,
  bebe: Bebe,
  filhote: Filhote,
  jovem: Jovem,
  adulto: Adulto,
}

const ASAS_POS: Record<EstagioChave, { y: number; spread: number }> = {
  ovo: { y: 74, spread: 1 },
  bebe: { y: 72, spread: 1 },
  filhote: { y: 80, spread: 1.05 },
  jovem: { y: 84, spread: 1.15 },
  adulto: { y: 90, spread: 1.3 },
}

export default function DragaoSVG({ estagio, asas = false, size = 140, className }: Props) {
  const Corpo = RENDER[estagio]
  const pos = ASAS_POS[estagio]
  return (
    <svg viewBox="0 0 140 150" width={size} height={size * (150 / 140)} className={className} role="img" aria-label={`Dragão — estágio ${estagio}${asas ? ' com asas' : ''}`}>
      <defs>
        <linearGradient id="corpo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={VERDE_CLARO} />
          <stop offset="100%" stopColor={VERDE} />
        </linearGradient>
        <radialGradient id="ovoBrilho" cx="38%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#fffbeb" stopOpacity="0" />
        </radialGradient>
      </defs>
      {asas && <Asas y={pos.y} spread={pos.spread} />}
      <Corpo />
    </svg>
  )
}
