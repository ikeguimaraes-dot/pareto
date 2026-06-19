'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

interface Props {
  profile: Profile & { areas?: { nome: string } | null }
}

function calcularIdade(dataNascimento: string): number {
  const hoje = new Date()
  const nasc = new Date(dataNascimento + 'T00:00:00')
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function PerfilCliente({ profile }: Props) {
  const supabase = createClient()

  const [form, setForm] = useState({
    nome: profile.nome,
    sobrenome: profile.sobrenome ?? '',
    data_nascimento: profile.data_nascimento ?? '',
    cargo: profile.cargo ?? '',
    descricao_cargo: profile.descricao_cargo ?? '',
  })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const idade = form.data_nascimento ? calcularIdade(form.data_nascimento) : null

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setMensagem('')
    setErro('')

    const { error } = await supabase
      .from('profiles')
      .update({
        nome: form.nome.trim(),
        sobrenome: form.sobrenome.trim() || null,
        data_nascimento: form.data_nascimento || null,
        cargo: form.cargo.trim() || null,
        descricao_cargo: form.descricao_cargo.trim() || null,
      })
      .eq('id', profile.id)

    setSalvando(false)
    if (error) {
      setErro(error.message)
    } else {
      setMensagem('Perfil atualizado com sucesso.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/registro" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors">
          ← Voltar
        </Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-900">Meu perfil</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form onSubmit={salvar} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Informações pessoais</h2>
            <p className="text-xs text-gray-500 mt-0.5">E-mail e área são definidos pelo administrador.</p>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
              />
            </div>

            {profile.areas && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Área</label>
                <input
                  type="text"
                  value={(profile.areas as { nome: string }).nome}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sobrenome</label>
                <input
                  type="text"
                  value={form.sobrenome}
                  onChange={e => setForm({ ...form, sobrenome: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data de nascimento
                {idade !== null && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{idade} anos</span>
                )}
              </label>
              <input
                type="date"
                value={form.data_nascimento}
                onChange={e => setForm({ ...form, data_nascimento: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cargo</label>
              <input
                type="text"
                value={form.cargo}
                onChange={e => setForm({ ...form, cargo: e.target.value })}
                placeholder="Ex: Gerente de Projetos"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição do cargo</label>
              <textarea
                value={form.descricao_cargo}
                onChange={e => setForm({ ...form, descricao_cargo: e.target.value })}
                rows={3}
                placeholder="Descreva suas responsabilidades principais..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {erro && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>
            )}
            {mensagem && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{mensagem}</div>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
