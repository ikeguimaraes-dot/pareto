'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Campo {
  key: string
  label: string
  type?: 'text' | 'color' | 'number' | 'select' | 'textarea'
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  defaultValue?: string | number
}

interface Item {
  id: string
  [key: string]: unknown
}

interface Props {
  titulo: string
  tabela: string
  itens: Item[]
  campos: Campo[]
  colunas: { key: string; label: string; render?: (v: unknown, item: Item) => React.ReactNode }[]
}

export default function CrudSimples({ titulo, tabela, itens, campos, colunas }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Item | null>(null)
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function initForm(item?: Item) {
    const init: Record<string, string | number> = {}
    campos.forEach(c => {
      if (item) {
        init[c.key] = item[c.key] as string | number ?? c.defaultValue ?? ''
      } else {
        init[c.key] = c.defaultValue ?? ''
      }
    })
    return init
  }

  function abrir(item?: Item) {
    setEditando(item ?? null)
    setForm(initForm(item))
    setErro('')
    setModalAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const payload: Record<string, unknown> = {}
    campos.forEach(c => { payload[c.key] = form[c.key] || null })

    try {
      if (editando) {
        const { error } = await supabase.from(tabela).update(payload).eq('id', editando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from(tabela).insert(payload)
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

  async function alternarAtivo(item: Item) {
    await supabase.from(tabela).update({ ativo: !item.ativo }).eq('id', item.id)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{itens.length} registro{itens.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => abrir()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          + Novo
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
              {colunas.map(col => (
                <th key={col.key} className="text-left px-5 py-3">{col.label}</th>
              ))}
              <th className="text-right px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {itens.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                {colunas.map(col => (
                  <td key={col.key} className="px-5 py-3 text-sm text-gray-800">
                    {col.render ? col.render(item[col.key], item) : String(item[col.key] ?? '—')}
                  </td>
                ))}
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => abrir(item)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Editar</button>
                    {'ativo' in item && (
                      <button onClick={() => alternarAtivo(item)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                        {item.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
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
              <h3 className="font-semibold text-gray-900">{editando ? `Editar ${titulo}` : `Novo ${titulo}`}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={salvar} className="p-5 space-y-4">
              {campos.map(campo => (
                <div key={campo.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{campo.label}{campo.required && ' *'}</label>
                  {campo.type === 'select' ? (
                    <select
                      value={String(form[campo.key] ?? '')}
                      onChange={e => setForm({ ...form, [campo.key]: e.target.value })}
                      required={campo.required}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Selecione</option>
                      {campo.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : campo.type === 'textarea' ? (
                    <textarea
                      value={String(form[campo.key] ?? '')}
                      onChange={e => setForm({ ...form, [campo.key]: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder={campo.placeholder}
                    />
                  ) : (
                    <input
                      type={campo.type ?? 'text'}
                      value={String(form[campo.key] ?? '')}
                      onChange={e => setForm({ ...form, [campo.key]: e.target.value })}
                      required={campo.required}
                      placeholder={campo.placeholder}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              ))}
              {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalAberto(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
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
