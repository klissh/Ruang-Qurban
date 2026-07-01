import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateKodeResi } from '@/lib/utils'
import type { ImportedKelompok } from '@/lib/importParser'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // ── Auth ──────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile || !['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'].includes(profile.role)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  // ── Payload ───────────────────────────────────────────────────────────
  const body = await request.json() as { kelompokList: ImportedKelompok[] }
  const { kelompokList } = body

  if (!Array.isArray(kelompokList) || kelompokList.length === 0) {
    return NextResponse.json({ error: 'Tidak ada data untuk diimport' }, { status: 400 })
  }

  // Tolak kelompok kosong sebelum mulai (defensive)
  const validList = kelompokList.filter((k) => k.jamaahList.length > 0)
  if (validList.length === 0) {
    return NextResponse.json({ error: 'Semua kelompok kosong' }, { status: 400 })
  }

  const workspaceId = profile.id_workspace!

  // ── Hitung nomor terakhir yang sudah ada (berdasarkan MAX kode, bukan COUNT)
  // Strategi ini tahan terhadap soft-delete, gap, dan import parsial sebelumnya.
  const [{ data: sapiARows }, { data: sapiBRows }, { data: kambingRows }] = await Promise.all([
    supabase.from('hewan').select('kode_resi').eq('id_workspace', workspaceId).like('kode_resi', 'SAPI-A%'),
    supabase.from('hewan').select('kode_resi').eq('id_workspace', workspaceId).like('kode_resi', 'SAPI-B%'),
    supabase.from('hewan').select('kode_resi').eq('id_workspace', workspaceId).like('kode_resi', 'KMB-%'),
  ])

  /** Ambil angka paling akhir dari kode_resi, misal 'SAPI-A11' → 11, 'KMB-048' → 48 */
  function maxKodeNum(rows: { kode_resi: string }[] | null): number {
    if (!rows || rows.length === 0) return 0
    return Math.max(0, ...rows.map((r) => {
      const m = r.kode_resi.match(/(\d+)$/)
      return m ? parseInt(m[1], 10) : 0
    }))
  }

  // Counter dimulai dari nomor tertinggi yang sudah ada
  let sapiACount   = maxKodeNum(sapiARows)
  let sapiBCount   = maxKodeNum(sapiBRows)
  let kambingCount = maxKodeNum(kambingRows)

  const imported : string[] = []
  const errors   : string[] = []

  // ── Insert satu per satu (sequential agar kode tidak bentrok) ─────────
  for (const kelompok of validList) {
    let kode_resi   : string
    let jenis_hewan : 'SAPI' | 'KAMBING'

    if (kelompok.tipe === 'SAPI-A') {
      sapiACount++
      kode_resi   = generateKodeResi('SAPI', sapiACount, 'A')
      jenis_hewan = 'SAPI'
    } else if (kelompok.tipe === 'SAPI-B') {
      sapiBCount++
      kode_resi   = generateKodeResi('SAPI', sapiBCount, 'B')
      jenis_hewan = 'SAPI'
    } else {
      kambingCount++
      kode_resi   = generateKodeResi('KAMBING', kambingCount)
      jenis_hewan = 'KAMBING'
    }

    // Insert hewan (kode_publik diisi oleh trigger DB)
    const { data: hewan, error: hewanErr } = await supabase
      .from('hewan')
      .insert({
        id_workspace: workspaceId,
        kode_resi,
        kode_publik: '',
        jenis_hewan,
      })
      .select('id')
      .single()

    if (hewanErr || !hewan) {
      errors.push(`Gagal membuat ${kode_resi}: ${hewanErr?.message ?? 'unknown error'}`)
      // Jangan rollback counter — kode ini mungkin sudah ada di DB,
      // rollback hanya akan menyebabkan percobaan berulang dengan kode yang sama.
      continue
    }

    // Insert semua jamaah dalam kelompok ini
    const jamaahRows = kelompok.jamaahList
      .filter((j) => j.nama_lengkap?.trim())
      .map((j) => ({
        id_workspace:   workspaceId,
        id_hewan:       hewan.id,
        nama_lengkap:   j.nama_lengkap.trim(),
        no_hp:          j.no_hp?.trim()          || null,
        alamat_lengkap: j.alamat_lengkap?.trim() || null,
      }))

    if (jamaahRows.length === 0) {
      // Tidak ada jamaah valid → hapus hewan yang baru dibuat (jangan biarkan yatim)
      await supabase.from('hewan').delete().eq('id', hewan.id)
      errors.push(`${kode_resi}: tidak ada jamaah valid, dilewati`)
      continue
    }

    const { error: jamaahErr } = await supabase.from('jamaah').insert(jamaahRows)
    if (jamaahErr) {
      // Jamaah gagal → hapus hewan agar tidak ada hewan kosong
      await supabase.from('hewan').delete().eq('id', hewan.id)
      errors.push(`Jamaah untuk ${kode_resi} gagal: ${jamaahErr.message} — hewan dihapus`)
      continue
    }

    imported.push(kode_resi)
  }

  return NextResponse.json({
    imported:     imported.length,
    importedList: imported,
    errors,
  })
}
