import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function verificarAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
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

  const adminClient = createAdminClient()

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const supabase = await createClient()
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authUser.user.id,
    nome,
    email,
    role,
    area_id: area_id || null,
    horas_dia_contratadas: horas_dia_contratadas ?? 8,
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ id: authUser.user.id }, { status: 201 })
}
