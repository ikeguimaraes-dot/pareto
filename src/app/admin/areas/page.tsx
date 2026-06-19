import { createClient } from '@/lib/supabase/server'
import CrudSimples from '@/components/crud-simples'

export default async function AreasPage() {
  const supabase = await createClient()
  const { data: areas } = await supabase.from('areas').select('*').order('nome')

  return (
    <CrudSimples
      titulo="Áreas"
      tabela="areas"
      itens={areas ?? []}
      campos={[
        { key: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: RH, Financeiro...' },
        { key: 'ativo', label: 'Ativo', type: 'select', options: [{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }], defaultValue: 'true' },
      ]}
      colunas={[
        { key: 'nome', label: 'Nome' },
        {
          key: 'ativo', label: 'Status',
          render: (v) => (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {v ? 'Ativa' : 'Inativa'}
            </span>
          )
        },
      ]}
    />
  )
}
