import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles').select('role, id_workspace').eq('id', user.id).single()
  if (caller?.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Hanya Super Admin yang bisa mengubah role' }, { status: 403 })

  const { user_id, workspace_role_id } = await request.json()
  if (!user_id || !workspace_role_id)
    return NextResponse.json({ error: 'user_id dan workspace_role_id wajib diisi' }, { status: 400 })

  // Tidak boleh ubah diri sendiri
  if (user_id === user.id)
    return NextResponse.json({ error: 'Tidak bisa mengubah role akun sendiri' }, { status: 400 })

  const service = createServiceClient()

  // Validasi role milik workspace yang sama
  const { data: wr } = await service
    .from('workspace_roles').select('id, nama, is_super_admin')
    .eq('id', workspace_role_id).eq('workspace_id', caller.id_workspace).single()
  if (!wr) return NextResponse.json({ error: 'Role tidak ditemukan di workspace ini' }, { status: 404 })

  const newProfileRole = wr.is_super_admin ? 'SUPER_ADMIN' : 'PETUGAS_LAPANGAN'

  const { error } = await service
    .from('profiles')
    .update({ workspace_role_id, role: newProfileRole })
    .eq('id', user_id).eq('id_workspace', caller.id_workspace)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, role: newProfileRole, workspace_role: wr })
}
