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

  // ── Langkah 1: Cari di tabel profiles dulu ───────────────────────────────
  let { data: targetProfile } = await serviceClient
    .from('profiles')
    .select('id, nama_lengkap, role, email, id_workspace, created_at')
    .eq('email', email)
    .single()

  // ── Langkah 2: Jika tidak ada di profiles, cek di auth.users ─────────────
  // Ini terjadi jika user sudah daftar tapi profile creation gagal (callback error)
  if (!targetProfile) {
    const { data: authUsers } = await serviceClient.auth.admin.listUsers()
    const authUser = authUsers?.users?.find((u) => u.email === email)

    if (!authUser) {
      return NextResponse.json({
        error: 'User dengan email ini belum mendaftar. Minta mereka daftar di /register/member terlebih dahulu.'
      }, { status: 404 })
    }

    // User ada di auth.users tapi belum punya profile — auto-create profile
    const namaLengkap = authUser.user_metadata?.nama_lengkap || authUser.email || 'Pengguna'
    const { data: createdProfile, error: createErr } = await serviceClient
      .from('profiles')
      .insert({
        id:           authUser.id,
        id_workspace: null,
        nama_lengkap: namaLengkap,
        role:         'PETUGAS_LAPANGAN',
        email:        authUser.email,
      })
      .select('id, nama_lengkap, role, email, id_workspace, created_at')
      .single()

    if (createErr || !createdProfile) {
      return NextResponse.json({ error: 'Gagal membuat profil untuk user ini' }, { status: 500 })
    }

    targetProfile = createdProfile
  }

  // ── Langkah 3: Cek apakah sudah di workspace lain ────────────────────────
  if (targetProfile.id_workspace) {
    return NextResponse.json({ error: 'User ini sudah tergabung di workspace lain.' }, { status: 409 })
  }

  // ── Langkah 4: Assign ke workspace caller ────────────────────────────────
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({
      id_workspace:      callerProfile.id_workspace,
      role:              role ?? 'PETUGAS_LAPANGAN',
      workspace_role_id: workspace_role_id ?? null,
    })
    .eq('id', targetProfile.id)

  if (updateError) return NextResponse.json({ error: 'Gagal menambahkan anggota' }, { status: 500 })

  return NextResponse.json({
    profile: {
      ...targetProfile,
      role:              role ?? 'PETUGAS_LAPANGAN',
      id_workspace:      callerProfile.id_workspace,
      workspace_role_id: workspace_role_id ?? null,
    }
  })
}
