'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const navLinks = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/areas', label: 'Áreas' },
  { href: '/admin/projetos', label: 'Projetos' },
  { href: '/admin/categorias', label: 'Categorias' },
  { href: '/admin/relatorios', label: 'Relatórios' },
]

export default function AdminNav({ nomeAdmin }: { nomeAdmin: string }) {
  const pathname = usePathname()
  const [menuAberto, setMenuAberto] = useState(false)

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-xl font-bold text-indigo-600">Pareto</Link>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const ativo = link.exact ? pathname === link.href : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    ativo ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-gray-500">{nomeAdmin}</span>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Sair</button>
            {/* Mobile menu button */}
            <button className="md:hidden p-1" onClick={() => setMenuAberto(!menuAberto)}>
              <div className="w-5 h-0.5 bg-gray-600 mb-1" />
              <div className="w-5 h-0.5 bg-gray-600 mb-1" />
              <div className="w-5 h-0.5 bg-gray-600" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuAberto && (
          <nav className="md:hidden py-2 border-t border-gray-100 flex flex-col gap-1">
            {navLinks.map(link => {
              const ativo = link.exact ? pathname === link.href : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuAberto(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ativo ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
