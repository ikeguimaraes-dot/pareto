import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const hoje = new Date()
  const inicioHoje = startOfDay(hoje).toISOString()
  const fimHoje = endOfDay(hoje).toISOString()
  const inicio7d = startOfDay(subDays(hoje, 6)).toISOString()

  const [
    { count: totalUsuarios },
    { count: totalAreas },
    { count: totalProjetos },
    { data: registrosHoje },
    { data: usuariosAtivos },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('areas').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('projetos').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('registros').select('user_id').gte('inicio', inicioHoje).lte('inicio', fimHoje),
    supabase.from('registros').select('user_id').gte('inicio', inicio7d).lte('inicio', fimHoje),
  ])

  const usuariosHoje = new Set(registrosHoje?.map(r => r.user_id) ?? []).size
  const usuariosUltimos7d = new Set(usuariosAtivos?.map(r => r.user_id) ?? []).size

  const cards = [
    { label: 'Colaboradores ativos', valor: totalUsuarios ?? 0, href: '/admin/usuarios', cor: 'bg-indigo-50 text-indigo-700' },
    { label: 'Áreas', valor: totalAreas ?? 0, href: '/admin/areas', cor: 'bg-green-50 text-green-700' },
    { label: 'Projetos', valor: totalProjetos ?? 0, href: '/admin/projetos', cor: 'bg-yellow-50 text-yellow-700' },
    { label: 'Registraram hoje', valor: usuariosHoje, href: '/admin/relatorios', cor: 'bg-purple-50 text-purple-700' },
    { label: 'Ativos em 7 dias', valor: usuariosUltimos7d, href: '/admin/relatorios', cor: 'bg-pink-50 text-pink-700' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel</h1>
        <p className="text-sm text-gray-500 mt-1">
          {format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
          >
            <div className={`text-3xl font-bold ${card.cor} rounded-xl px-3 py-1 inline-block mb-2`}>
              {card.valor}
            </div>
            <p className="text-sm text-gray-600 font-medium">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: '/admin/relatorios', icon: '📊', titulo: 'Ver relatórios', desc: 'Onde o tempo vai, benchmarks, 80/20' },
          { href: '/admin/usuarios', icon: '👥', titulo: 'Gerenciar usuários', desc: 'Criar, editar, ativar/desativar' },
          { href: '/admin/projetos', icon: '📁', titulo: 'Projetos', desc: 'Gerenciar projetos e áreas' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm hover:border-indigo-200 transition-all flex items-start gap-3"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="font-semibold text-gray-900">{item.titulo}</p>
              <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
