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

  // Workspace ID diambil dari session (bukan dari body) untuk mencegah
  // SUPER_ADMIN menyuntikkan user ke workspace lain.
  const workspaceId = profile.id_workspace
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace tidak ditemukan' }, { status: 403 })
  }

  const body = await request.json()
  const { nama_lengkap, email, password, role } = body as {
    nama_lengkap: string; email: string; password: string; role: Role
  }

  if (!email || !password || !nama_lengkap) {
    return NextResponse.json({ error: 'nama_lengkap, email, dan password wajib diisi' }, { status: 400 })
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

  // Buat profil dengan workspaceId dari session caller (bukan dari body)
  const { data: newProfile, error: profileError } = await serviceSupabase
    .from('profiles')
    .insert({ id: newUser.user.id, id_workspace: workspaceId, nama_lengkap, role })
    .select()
    .single()

  if (profileError) {
    // Rollback: hapus user yang baru dibuat
    await serviceSupabase.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: 'Gagal membuat profil panitia' }, { status: 500 })
  }

  return NextResponse.json({ profile: newProfile })
}
