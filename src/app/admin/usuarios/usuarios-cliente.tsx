'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, Area } from '@/types/database'

interface ProfileComArea extends Profile {
  areas?: { nome: string } | null
}

interface Props {
  usuarios: ProfileComArea[]
  areas: Area[]
}

const CAMPOS_VAZIOS = {
  nome: '', sobrenome: '', email: '', senha: '', role: 'colaborador' as 'admin' | 'colaborador',
  area_id: '', horas_dia_contratadas: 8,
  data_nascimento: '', cargo: '', descricao_cargo: '',
}

function calcularIdade(dataNascimento: string): number {
  const hoje = new Date()
  const nasc = new Date(dataNascimento + 'T00:00:00')
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function UsuariosCliente({ usuarios, areas }: Props) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ProfileComArea | null>(null)
  const [form, setForm] = useState(CAMPOS_VAZIOS)
  const [novaSenha, setNovaSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function abrirNovo() {
    setEditando(null)
    setForm(CAMPOS_VAZIOS)
    setNovaSenha('')
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(u: ProfileComArea) {
    setEditando(u)
    setForm({
      nome: u.nome,
      sobrenome: u.sobrenome ?? '',
      email: u.email,
      senha: '',
      role: u.role,
      area_id: u.area_id ?? '',
      horas_dia_contratadas: u.horas_dia_contratadas,
      data_nascimento: u.data_nascimento ?? '',
      cargo: u.cargo ?? '',
      descricao_cargo: u.descricao_cargo ?? '',
    })
    setNovaSenha('')
    setErro('')
    setModalAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    try {
      if (editando) {
        const body: Record<string, unknown> = {
          nome: form.nome.trim(),
          sobrenome: form.sobrenome.trim() || null,
          role: form.role,
          area_id: form.area_id || null,
          horas_dia_contratadas: form.horas_dia_contratadas,
          data_nascimento: form.data_nascimento || null,
          cargo: form.cargo.trim() || null,
          descricao_cargo: form.descricao_cargo.trim() || null,
          ativo: editando.ativo,
        }
        if (novaSenha) body.nova_senha = novaSenha

        const res = await fetch(`/api/admin/usuarios/${editando.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error)
        }
      } else {
        if (!form.senha) { setErro('Senha obrigatória.'); setCarregando(false); return }
        const res = await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, senha: form.senha }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error)
        }
      }

      setModalAberto(false)
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setCarregando(false)
    }
  }

  async function alternarAtivo(u: ProfileComArea) {
    await fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !u.ativo }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">{usuarios.length} cadastrado{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={abrirNovo} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          + Novo usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">E-mail</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Cargo</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Área</th>
                <th className="text-left px-5 py-3">Papel</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900 text-sm">
                      {u.nome}{u.sobrenome ? ` ${u.sobrenome}` : ''}
                      {u.data_nascimento && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                          {calcularIdade(u.data_nascimento)} anos
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 sm:hidden">{u.email}</div>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell text-sm text-gray-600">{u.email}</td>
                  <td className="px-5 py-3 hidden lg:table-cell text-sm text-gray-600">
                    {u.cargo ?? '—'}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-sm text-gray-600">
                    {u.areas ? (u.areas as { nome: string }).nome : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Colaborador'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => abrirEditar(u)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Editar</button>
                      <button onClick={() => alternarAtivo(u)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editando ? 'Editar usuário' : 'Novo usuário'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <form onSubmit={salvar} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                  <input
                    type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    required className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sobrenome</label>
                  <input
                    type="text" value={form.sobrenome} onChange={e => setForm({ ...form, sobrenome: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail *</label>
                <input
                  type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  required disabled={!!editando}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                />
              </div>

              {!editando ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha *</label>
                  <input
                    type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })}
                    required minLength={6}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha (opcional)</label>
                  <input
                    type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                    minLength={6}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Deixe em branco para não alterar"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Papel *</label>
                  <select
                    value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'admin' | 'colaborador' })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="colaborador">Colaborador</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Horas/dia</label>
                  <input
                    type="number" value={form.horas_dia_contratadas} min={1} max={24} step={0.5}
                    onChange={e => setForm({ ...form, horas_dia_contratadas: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Data de nascimento
                  {form.data_nascimento && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {calcularIdade(form.data_nascimento)} anos
                    </span>
                  )}
                </label>
                <input
                  type="date" value={form.data_nascimento} onChange={e => setForm({ ...form, data_nascimento: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cargo</label>
                <input
                  type="text" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}
                  placeholder="Ex: Gerente de Projetos"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição do cargo</label>
                <textarea
                  value={form.descricao_cargo} onChange={e => setForm({ ...form, descricao_cargo: e.target.value })}
                  rows={2} placeholder="Responsabilidades principais..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Área</label>
                <select
                  value={form.area_id} onChange={e => setForm({ ...form, area_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sem área</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalAberto(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={carregando} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                  {carregando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
