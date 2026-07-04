import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Pastikan route ini selalu dieksekusi fresh (tidak di-cache), karena
// status pengantaran & status hewan berubah real-time dan halaman publik
// bergantung pada auto-refresh polling tiap 30 detik
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const kode = request.nextUrl.searchParams.get('kode')?.trim().toUpperCase()

  if (!kode || kode.length < 4) {
    return NextResponse.json(
      { error: 'Kode tidak valid' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Cari hewan berdasarkan kode_publik (bukan kode_resi, untuk keamanan)
  const { data: hewan, error } = await supabase
    .from('hewan')
    .select('id, kode_resi, jenis_hewan, status, url_dokumentasi, id_workspace')
    .eq('kode_publik', kode)
    .is('deleted_at', null)
    .single()

  if (error || !hewan) {
    return NextResponse.json(
      { error: 'Resi tidak ditemukan. Periksa kembali kode Anda.' },
      { status: 404 }
    )
  }

  // Ambil daftar jamaah — tampilkan nama tanpa sensor untuk transparansi
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
      totalSapi:    (allHewan ?? []).filter((h) => h.jenis_hewan === 'SAPI').length,
      totalKambing: (allHewan ?? []).filter((h) => h.jenis_hewan === 'KAMBING').length,
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
