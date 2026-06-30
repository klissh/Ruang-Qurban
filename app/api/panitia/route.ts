import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, id_workspace').eq('id', user.id).single()

  if (profile?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Hanya Super Admin yang bisa menambah panitia' }, { status: 403 })
  }

  const body = await request.json()
  const { nama_lengkap, email, password, role, workspace_id } = body as {
    nama_lengkap: string; email: string; password: string; role: Role; workspace_id: string
  }

  // Gunakan service role untuk membuat user baru
  const serviceSupabase = createServiceClient()

  const { data: newUser, error: authError } = await serviceSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'Gagal membuat akun' }, { status: 400 })
  }

  // Buat profil
  const { data: newProfile, error: profileError } = await serviceSupabase
    .from('profiles')
    .insert({ id: newUser.user.id, id_workspace: workspace_id, nama_lengkap, role })
    .select()
    .single()

  if (profileError) {
    // Rollback: hapus user yang baru dibuat
    await serviceSupabase.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: 'Gagal membuat profil panitia' }, { status: 500 })
  }

  return NextResponse.json({ profile: newProfile })
}
