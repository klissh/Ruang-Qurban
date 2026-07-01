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

  const workspaceId = profile.id_workspace!

  // ── Ambil jumlah hewan yang sudah ada (per tipe) ──────────────────────
  const [{ data: sapiARows }, { data: sapiBRows }, { count: kambingExisting }] = await Promise.all([
    supabase
      .from('hewan')
      .select('kode_resi')
      .eq('id_workspace', workspaceId)
      .eq('jenis_hewan', 'SAPI')
      .like('kode_resi', 'SAPI-A%')
      .is('deleted_at', null),
    supabase
      .from('hewan')
      .select('kode_resi')
      .eq('id_workspace', workspaceId)
      .eq('jenis_hewan', 'SAPI')
      .like('kode_resi', 'SAPI-B%')
      .is('deleted_at', null),
    supabase
      .from('hewan')
      .select('id', { count: 'exact', head: true })
      .eq('id_workspace', workspaceId)
      .eq('jenis_hewan', 'KAMBING')
      .is('deleted_at', null),
  ])

  // Counter berjalan — dinaikkan setiap kali berhasil insert
  let sapiACount    = sapiARows?.length    ?? 0
  let sapiBCount    = sapiBRows?.length    ?? 0
  let kambingCount  = kambingExisting      ?? 0

  const imported : string[] = []
  const errors   : string[] = []

  // ── Insert satu per satu (sequential agar kode tidak bentrok) ─────────
  for (const kelompok of kelompokList) {
    let kode_resi   : string
    let jenis_hewan : 'SAPI' | 'KAMBING'

    if (kelompok.tipe === 'SAPI-A') {
      sapiACount++
      // index 1..9 → SAPI-A01..A09
      kode_resi   = generateKodeResi('SAPI', sapiACount)
      jenis_hewan = 'SAPI'
    } else if (kelompok.tipe === 'SAPI-B') {
      sapiBCount++
      // index 10..18 → SAPI-B01..B09  (offset 9)
      kode_resi   = generateKodeResi('SAPI', 9 + sapiBCount)
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
      .select()
      .single()

    if (hewanErr || !hewan) {
      errors.push(`Gagal membuat ${kode_resi}: ${hewanErr?.message ?? 'unknown error'}`)
      // Rollback counter agar gap kode tidak terjadi
      if (kelompok.tipe === 'SAPI-A')      sapiACount--
      else if (kelompok.tipe === 'SAPI-B') sapiBCount--
      else                                  kambingCount--
      continue
    }

    // Insert semua jamaah dalam kelompok ini
    const jamaahRows = kelompok.jamaahList
      .filter((j) => j.nama_lengkap.trim())
      .map((j) => ({
        id_workspace:   workspaceId,
        id_hewan:       hewan.id,
        nama_lengkap:   j.nama_lengkap.trim(),
        no_hp:          j.no_hp?.trim()          || null,
        alamat_lengkap: j.alamat_lengkap?.trim() || null,
      }))

    if (jamaahRows.length > 0) {
      const { error: jamaahErr } = await supabase.from('jamaah').insert(jamaahRows)
      if (jamaahErr) {
        errors.push(`Jamaah untuk ${kode_resi} gagal disimpan: ${jamaahErr.message}`)
        // Hewan sudah dibuat, biarkan — admin bisa edit manual
      }
    }

    imported.push(kode_resi)
  }

  return NextResponse.json({
    imported:     imported.length,
    importedList: imported,
    errors,
  })
}
