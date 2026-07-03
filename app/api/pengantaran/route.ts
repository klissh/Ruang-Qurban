import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StatusAntar } from '@/types'

// PATCH: update status_antar untuk satu atau banyak jamaah sekaligus
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile || !['SUPER_ADMIN', 'PETUGAS_LAPANGAN'].includes(profile.role)) {
    return NextResponse.json({ error: 'Tidak punya akses mengubah status pengantaran' }, { status: 403 })
  }

  const body = await request.json()
  const { ids, status_antar, diantar_oleh } = body as {
    ids: string[]
    status_antar: StatusAntar
    diantar_oleh?: string | null
  }

  if (!ids?.length) {
    return NextResponse.json({ error: 'ids wajib diisi' }, { status: 400 })
  }

  const updateData: Record<string, string | null> = { status_antar }
  // Set/hapus waktu_antar mengikuti status
  updateData.waktu_antar = status_antar === 'BELUM_DIANTAR' ? null : new Date().toISOString()
  if (diantar_oleh !== undefined) updateData.diantar_oleh = diantar_oleh?.trim() || null

  const { data, error } = await supabase
    .from('jamaah')
    .update(updateData)
    .in('id', ids)
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)
    .select('id, kode_jamaah, status_antar, waktu_antar, diantar_oleh')

  if (error) {
    return NextResponse.json({ error: 'Gagal memperbarui status pengantaran' }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: data })
}
