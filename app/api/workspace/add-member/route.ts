import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles').select('role, id_workspace').eq('id', user.id).single()

  if (callerProfile?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Hanya Super Admin yang bisa menambah anggota' }, { status: 403 })
  }

  const body = await request.json()
  const { email, role, workspace_role_id } = body as { email: string; role: Role; workspace_role_id?: string }

  if (!email) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })

  const serviceClient = createServiceClient()

  // Cari profile berdasarkan email
  const { data: targetProfile, error: findError } = await serviceClient
    .from('profiles')
    .select('id, nama_lengkap, role, email, id_workspace, created_at')
    .eq('email', email)
    .single()

  if (findError || !targetProfile) {
    return NextResponse.json({ error: 'User dengan email ini belum mendaftar. Minta mereka daftar di /register/member terlebih dahulu.' }, { status: 404 })
  }

  if (targetProfile.id_workspace) {
    return NextResponse.json({ error: 'User ini sudah tergabung di workspace lain.' }, { status: 409 })
  }

  // Assign ke workspace
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({
      id_workspace: callerProfile.id_workspace,
      role: role ?? 'PETUGAS_LAPANGAN',
      workspace_role_id: workspace_role_id ?? null,
    })
    .eq('id', targetProfile.id)

  if (updateError) return NextResponse.json({ error: 'Gagal menambahkan anggota' }, { status: 500 })

  return NextResponse.json({
    profile: { ...targetProfile, role: role ?? 'PETUGAS_LAPANGAN', id_workspace: callerProfile.id_workspace, workspace_role_id: workspace_role_id ?? null }
  })
}
