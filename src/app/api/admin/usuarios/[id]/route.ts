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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verificarAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { nova_senha, ...profileUpdates } = body

  const adminClient = createAdminClient()

  // Atualizar senha no Auth (opcional)
  if (nova_senha) {
    const { error } = await adminClient.auth.admin.updateUserById(id, { password: nova_senha })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Atualizar campos da ficha em profiles via adminClient (bypassa RLS)
  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await adminClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verificarAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params
  const adminClient = createAdminClient()

  // Deletar auth user — o ON DELETE CASCADE em profiles remove a ficha automaticamente
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
