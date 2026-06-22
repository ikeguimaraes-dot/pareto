export type Role = 'admin' | 'colaborador'

export interface Profile {
  id: string
  nome: string
  sobrenome: string | null
  email: string
  role: Role
  area_id: string | null
  horas_dia_contratadas: number
  ativo: boolean
  data_nascimento: string | null   // date ISO: 'YYYY-MM-DD'
  cargo: string | null
  descricao_cargo: string | null
  moedas: number                    // saldo — atualizado só pela função processar_pontuacao_diaria()
  created_at: string
}

// Histórico de pontuação por dia avaliado. Preenchido exclusivamente pela
// função processar_pontuacao_diaria(); nunca escrever no cliente.
export interface PontuacaoDiaria {
  id: string
  user_id: string
  data: string          // 'YYYY-MM-DD'
  percentual: number    // % das horas contratadas registradas naquele dia
  bateu_meta: boolean
  moedas_delta: number  // moedas ganhas (+) ou perdidas (−) no dia
  created_at: string
}

export interface Area {
  id: string
  nome: string
  ativo: boolean
  created_at: string
}

export interface Projeto {
  id: string
  nome: string
  area_id: string | null
  descricao: string | null
  ativo: boolean
  created_at: string
}

export interface CategoriaAtividade {
  id: string
  nome: string
  cor: string
}

export interface Registro {
  id: string
  user_id: string
  area_id: string | null
  categoria_id: string
  projeto_id: string | null
  descricao: string
  participantes: string | null
  inicio: string
  fim: string | null
  entrega_concluida: boolean | null
  created_at: string
  updated_at: string
}

export interface RegistroComRelacoes extends Registro {
  profiles?: Profile
  areas?: Area
  categorias_atividade?: CategoriaAtividade
  projetos?: Projeto
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'moedas'>
        // moedas é controlado pelo banco — fora do Update permitido no app.
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'moedas'>>
      }
      pontuacao_diaria: {
        Row: PontuacaoDiaria
        Insert: never
        Update: never
      }
      areas: {
        Row: Area
        Insert: Omit<Area, 'id' | 'created_at'>
        Update: Partial<Omit<Area, 'id' | 'created_at'>>
      }
      projetos: {
        Row: Projeto
        Insert: Omit<Projeto, 'id' | 'created_at'>
        Update: Partial<Omit<Projeto, 'id' | 'created_at'>>
      }
      categorias_atividade: {
        Row: CategoriaAtividade
        Insert: Omit<CategoriaAtividade, 'id'>
        Update: Partial<Omit<CategoriaAtividade, 'id'>>
      }
      registros: {
        Row: Registro
        Insert: Omit<Registro, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Registro, 'id' | 'created_at'>>
      }
    }
  }
}
