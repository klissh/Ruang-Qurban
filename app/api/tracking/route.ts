import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Route ini selalu dieksekusi fresh — tracking publik bergantung pada polling 30 detik
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Karakter valid untuk kode_publik (format: XXXX-XXXX, 9 karakter termasuk dash)
const KODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('kode')?.trim().toUpperCase() ?? ''

  // Validasi format ketat — tolak input yang tidak sesuai format kode_publik
  if (!KODE_REGEX.test(raw)) {
    return NextResponse.json(
      { error: 'Format kode tidak valid. Gunakan format: XXXX-XXXX' },
      { status: 400 }
    )
  }

  // Service role digunakan di sini secara intentional karena endpoint ini publik
  // (tidak ada sesi user) sementara tabel jamaah, workspaces, dan periode_qurban
  // belum memiliki public read RLS policy.
  // TODO: ganti ke anon client setelah migration public_tracking_policies ditambahkan.
  const supabase = createServiceClient()

  // Cari hewan berdasarkan kode_publik (bukan kode_resi, untuk keamanan)
  const { data: hewan, error } = await supabase
    .from('hewan')
    .select('id, kode_resi, jenis_hewan, status, url_dokumentasi, id_workspace')
    .eq('kode_publik', raw)
    .is('deleted_at', null)
    .single()

  if (error || !hewan) {
    return NextResponse.json(
      { error: 'Resi tidak ditemukan. Periksa kembali kode Anda.' },
      { status: 404 }
    )
  }

  // Ambil daftar jamaah — hanya field yang diperlukan untuk display publik
  // (no_hp dan alamat_lengkap sengaja tidak diambil)
  const { data: jamaah } = await supabase
    .from('jamaah')
    .select('id, nama_lengkap, atas_nama, kode_jamaah, status_antar, diantar_oleh')
    .eq('id_hewan', hewan.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  // Ambil nama workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('nama')
    .eq('id', hewan.id_workspace)
    .single()

  // Ambil periode aktif workspace ini (untuk scope stats)
  const { data: periode } = await supabase
    .from('periode_qurban')
    .select('id, tahun, nama_event')
    .eq('id_workspace', hewan.id_workspace)
    .eq('status', 'aktif')
    .single()

  // Hitung total hewan + jamaah di workspace (periode aktif)
  let workspaceStats = { totalSapi: 0, totalKambing: 0, totalJamaah: 0, labelPeriode: '' }
  if (periode) {
    const { data: allHewan } = await supabase
      .from('hewan')
      .select('jenis_hewan')
      .eq('id_workspace', hewan.id_workspace)
      .eq('periode_id', periode.id)
      .is('deleted_at', null)

    const { count: jmlJamaah } = await supabase
      .from('jamaah')
      .select('id', { count: 'exact', head: true })
      .eq('id_workspace', hewan.id_workspace)
      .eq('periode_id', periode.id)
      .is('deleted_at', null)

    workspaceStats = {
      totalSapi:    (allHewan ?? []).filter((h: { jenis_hewan: string }) => h.jenis_hewan === 'SAPI').length,
      totalKambing: (allHewan ?? []).filter((h: { jenis_hewan: string }) => h.jenis_hewan === 'KAMBING').length,
      totalJamaah:  jmlJamaah ?? 0,
      labelPeriode: periode.nama_event ?? `Qurban ${periode.tahun}`,
    }
  }

  return NextResponse.json({
    data: {
      kode_resi: hewan.kode_resi,
      jenis_hewan: hewan.jenis_hewan,
      status: hewan.status,
      url_dokumentasi: hewan.url_dokumentasi,
      nama_workspace: workspace?.nama ?? '',
      jamaah: jamaah ?? [],
      workspace_stats: workspaceStats,
    }
  })
}
