'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Projeto, Area } from '@/types/database'

interface ProjetoComArea extends Projeto {
  areas?: { nome: string } | null
}

interface Props {
  projetos: ProjetoComArea[]
  areas: Area[]
}

export default function ProjetosCliente({ projetos, areas }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ProjetoComArea | null>(null)
  const [form, setForm] = useState({ nome: '', area_id: '', descricao: '', ativo: true })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function abrir(item?: ProjetoComArea) {
    setEditando(item ?? null)
    setForm({
      nome: item?.nome ?? '',
      area_id: item?.area_id ?? '',
      descricao: item?.descricao ?? '',
      ativo: item?.ativo ?? true,
    })
    setErro('')
    setModalAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    const payload = { nome: form.nome, area_id: form.area_id || null, descricao: form.descricao || null, ativo: form.ativo }

    try {
      if (editando) {
        const { error } = await supabase.from('projetos').update(payload).eq('id', editando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('projetos').insert(payload)
        if (error) throw error
      }
      setModalAberto(false)
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setCarregando(false)
    }
  }

  async function alternarAtivo(p: ProjetoComArea) {
    await supabase.from('projetos').update({ ativo: !p.ativo }).eq('id', p.id)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projetos.length} projeto{projetos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => abrir()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          + Novo projeto
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3">Nome</th>
              <th className="text-left px-5 py-3 hidden sm:table-cell">Área</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Descrição</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projetos.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-sm text-gray-900">{p.nome}</td>
                <td className="px-5 py-3 text-sm text-gray-600 hidden sm:table-cell">{p.areas ? (p.areas as { nome: string }).nome : '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell truncate max-w-xs">{p.descricao ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => abrir(p)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Editar</button>
                    <button onClick={() => alternarAtivo(p)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">{p.ativo ? 'Desativar' : 'Ativar'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editando ? 'Editar projeto' : 'Novo projeto'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={salvar} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Área</label>
                <select value={form.area_id} onChange={e => setForm({ ...form, area_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sem área</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalAberto(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={carregando} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
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
