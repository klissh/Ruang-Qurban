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
    url_dokumentasi?: string | null   // null = hapus, undefined = jangan sentuh
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
  const updateData: Record<string, string | null> = { status: status_baru }
  // undefined = skip, null = hapus, string = update
  if (url_dokumentasi !== undefined) updateData.url_dokumentasi = url_dokumentasi || null

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


// PUT: tukar nomor kambing — swap jamaah antara dua slot kambing
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile || !['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'].includes(profile.role))
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const { id_hewan_a, id_hewan_b } = await request.json() as {
    id_hewan_a: string
    id_hewan_b: string
  }

  // Validasi keduanya milik workspace, jenis kambing
  const { data: hewanList } = await supabase
    .from('hewan')
    .select('id, kode_resi, jenis_hewan')
    .in('id', [id_hewan_a, id_hewan_b])
    .eq('id_workspace', profile.id_workspace)
    .eq('jenis_hewan', 'KAMBING')
    .is('deleted_at', null)

  if (!hewanList || hewanList.length !== 2)
    return NextResponse.json({ error: 'Salah satu atau keduanya bukan kambing milik workspace ini' }, { status: 404 })

  // Ambil jamaah aktif di masing-masing kambing
  const { data: jamaahA } = await supabase
    .from('jamaah').select('id').eq('id_hewan', id_hewan_a).is('deleted_at', null)
  const { data: jamaahB } = await supabase
    .from('jamaah').select('id').eq('id_hewan', id_hewan_b).is('deleted_at', null)

  const idsA = (jamaahA ?? []).map((j) => j.id)
  const idsB = (jamaahB ?? []).map((j) => j.id)

  // Swap: gunakan id placeholder sementara untuk menghindari constraint conflict
  // A → B, B → A (dua update atomik)
  if (idsA.length > 0) {
    await supabase.from('jamaah').update({ id_hewan: id_hewan_b }).in('id', idsA)
  }
  if (idsB.length > 0) {
    await supabase.from('jamaah').update({ id_hewan: id_hewan_a }).in('id', idsB)
  }

  const hewanA = hewanList.find((h) => h.id === id_hewan_a)!
  const hewanB = hewanList.find((h) => h.id === id_hewan_b)!

  return NextResponse.json({
    success: true,
    swap: `${hewanA.kode_resi} ↔ ${hewanB.kode_resi}`,
    id_hewan_a, id_hewan_b,
    ids_moved_to_b: idsA,
    ids_moved_to_a: idsB,
  })
}

// DELETE: hapus hewan + cascade soft delete semua jamaahnya
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile || !['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'].includes(profile.role))
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })

  // Pastikan hewan milik workspace ini
  const { data: hewan } = await supabase
    .from('hewan')
    .select('id, kode_resi')
    .eq('id', id)
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)
    .single()

  if (!hewan) return NextResponse.json({ error: 'Hewan tidak ditemukan' }, { status: 404 })

  const now = new Date().toISOString()

  // Soft delete semua jamaah aktif di hewan ini
  await supabase
    .from('jamaah')
    .update({ deleted_at: now })
    .eq('id_hewan', id)
    .is('deleted_at', null)

  // Soft delete hewan
  const { error } = await supabase
    .from('hewan')
    .update({ deleted_at: now })
    .eq('id', id)

  if (error)
    return NextResponse.json({ error: 'Gagal menghapus hewan' }, { status: 500 })

  return NextResponse.json({ success: true, kode_resi: hewan.kode_resi })
}
