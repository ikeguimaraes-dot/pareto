import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function verificarAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function POST(request: Request) {
  const admin = await verificarAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await request.json()
  const { nome, email, senha, role, area_id, horas_dia_contratadas } = body

  if (!nome || !email || !senha || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  // Usar adminClient para TUDO: bypassa RLS e evita recursão nas policies de profiles
  const adminClient = createAdminClient()

  // Passo 1: criar o usuário no Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const novoId = authData.user.id

  // Passo 2: inserir profile usando adminClient (service_role bypassa RLS)
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: novoId,
      nome,
      email,
      role,
      area_id: area_id || null,
      horas_dia_contratadas: horas_dia_contratadas ?? 8,
    })

  if (profileError) {
    // Rollback: remover o auth user para não deixar conta órfã
    await adminClient.auth.admin.deleteUser(novoId)
    return NextResponse.json(
      { error: `Erro ao criar ficha do usuário: ${profileError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ id: novoId }, { status: 201 })
}
