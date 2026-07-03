import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles').select('role, id_workspace').eq('id', user.id).single()

  if (callerProfile?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Hanya Super Admin yang bisa menghapus anggota' }, { status: 403 })
  }

  const { user_id } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'user_id wajib diisi' }, { status: 400 })
  }

  // Tidak boleh hapus diri sendiri
  if (user_id === user.id) {
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Pastikan target adalah anggota workspace yang sama
  const { data: targetProfile } = await serviceClient
    .from('profiles')
    .select('id, id_workspace, nama_lengkap')
    .eq('id', user_id)
    .single()

  if (!targetProfile || targetProfile.id_workspace !== callerProfile.id_workspace) {
    return NextResponse.json({ error: 'User tidak ditemukan di workspace ini' }, { status: 404 })
  }

  // Set id_workspace null (keluarkan dari workspace)
  const { error } = await serviceClient
    .from('profiles')
    .update({ id_workspace: null, role: 'PETUGAS_LAPANGAN' })
    .eq('id', user_id)

  if (error) {
    return NextResponse.json({ error: 'Gagal menghapus anggota' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
