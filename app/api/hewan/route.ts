import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifikasiJamaahHewan } from '@/lib/fonnte'
import type { StatusHewan } from '@/types'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ambil profile user + cek role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile tidak ditemukan' }, { status: 403 })
  }

  // Hanya SUPER_ADMIN dan PETUGAS_LAPANGAN yang boleh ubah status
  if (!['SUPER_ADMIN', 'PETUGAS_LAPANGAN'].includes(profile.role)) {
    return NextResponse.json({ error: 'Tidak punya akses mengubah status' }, { status: 403 })
  }

  const body = await request.json()
  const { id_hewan, status_baru, url_dokumentasi } = body as {
    id_hewan: string
    status_baru: StatusHewan
    url_dokumentasi?: string
  }

  // Ambil data hewan sekarang (untuk status_lama dan validasi workspace)
  const { data: hewan } = await supabase
    .from('hewan')
    .select('id, kode_resi, kode_publik, status, id_workspace')
    .eq('id', id_hewan)
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)
    .single()

  if (!hewan) {
    return NextResponse.json({ error: 'Hewan tidak ditemukan' }, { status: 404 })
  }

  // Update status hewan
  const updateData: Record<string, string> = { status: status_baru }
  if (url_dokumentasi) updateData.url_dokumentasi = url_dokumentasi

  const { error: updateError } = await supabase
    .from('hewan')
    .update(updateData)
    .eq('id', id_hewan)

  if (updateError) {
    return NextResponse.json({ error: 'Gagal mengubah status' }, { status: 500 })
  }

  // Catat ke audit log
  await supabase.from('status_log').insert({
    id_hewan,
    id_user: profile.id,
    nama_user: profile.nama_lengkap,
    status_lama: hewan.status,
    status_baru,
  })

  // Kirim notifikasi WhatsApp jika status SEDANG_DISEMBELIH atau SELESAI
  if (['SEDANG_DISEMBELIH', 'SELESAI'].includes(status_baru)) {
    const { data: jamaahList } = await supabase
      .from('jamaah')
      .select('nama_lengkap, no_hp')
      .eq('id_hewan', id_hewan)
      .is('deleted_at', null)

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('nama')
      .eq('id', profile.id_workspace)
      .single()

    if (jamaahList && workspace) {
      // Fire-and-forget — jangan blocking response
      notifikasiJamaahHewan({
        jamaahList: jamaahList as { nama_lengkap: string; no_hp: string | null }[],
        kodeResi: hewan.kode_resi,
        kodePublik: hewan.kode_publik,
        status: status_baru as 'SEDANG_DISEMBELIH' | 'SELESAI',
        namaWorkspace: workspace.nama,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin,
      }).catch(console.error)
    }
  }

  return NextResponse.json({ success: true, status_baru })
}
