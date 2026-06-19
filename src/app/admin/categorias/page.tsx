import { createClient } from '@/lib/supabase/server'
import CrudSimples from '@/components/crud-simples'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: categorias } = await supabase.from('categorias_atividade').select('*').order('nome')

  return (
    <CrudSimples
      titulo="Categorias de atividade"
      tabela="categorias_atividade"
      itens={categorias ?? []}
      campos={[
        { key: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: Reunião, Trabalho focado...' },
        { key: 'cor', label: 'Cor', type: 'color', defaultValue: '#6B7280' },
      ]}
      colunas={[
        { key: 'nome', label: 'Nome', renderType: 'color-label', colorKey: 'cor' },
        { key: 'cor', label: 'Cor', renderType: 'color-dot' },
      ]}
    />
  )
}
