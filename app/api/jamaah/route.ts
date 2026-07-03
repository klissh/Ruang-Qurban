import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateKodeResi } from '@/lib/utils'
import type { JenisHewan, JamaahFormData } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
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

  // Ambil periode aktif — wajib ada sebelum insert data apapun
  const { data: periodeAktif } = await supabase
    .from('periode_qurban')
    .select('id')
    .eq('id_workspace', profile.id_workspace)
    .eq('status', 'aktif')
    .single()

  if (!periodeAktif)
    return NextResponse.json({ error: 'Tidak ada periode aktif. Buat periode baru terlebih dahulu.' }, { status: 409 })

  const periodeId = periodeAktif.id
  const body = await request.json()

  // ── Mode B: tambah jamaah ke hewan yang sudah ada ──
  if (body.id_hewan) {
    const { id_hewan, jamaah } = body as { id_hewan: string; jamaah: JamaahFormData[] }

    const { data: hewan } = await supabase
      .from('hewan')
      .select('id, jenis_hewan, kode_resi')
      .eq('id', id_hewan)
      .eq('id_workspace', profile.id_workspace)
      .is('deleted_at', null)
      .single()

    if (!hewan) return NextResponse.json({ error: 'Hewan tidak ditemukan' }, { status: 404 })

    const { count: existing } = await supabase
      .from('jamaah')
      .select('id', { count: 'exact', head: true })
      .eq('id_hewan', id_hewan)
      .is('deleted_at', null)

    const maxSlot = hewan.jenis_hewan === 'SAPI' ? 7 : 1
    const valid = jamaah.filter((j) => j.nama_lengkap.trim())

    if ((existing ?? 0) + valid.length > maxSlot)
      return NextResponse.json({ error: `Slot ${hewan.kode_resi} hanya tersisa ${maxSlot - (existing ?? 0)}` }, { status: 409 })

    const rows = valid.map((j) => ({
      id_workspace: profile.id_workspace,
      periode_id: periodeId,
      id_hewan,
      nama_lengkap: j.nama_lengkap.trim(),
      atas_nama: j.atas_nama?.trim() || null,
      no_hp: j.no_hp?.trim() || null,
      alamat_lengkap: j.alamat_lengkap?.trim() || null,
    }))

    const { data: inserted, error } = await supabase.from('jamaah').insert(rows).select()
    if (error || !inserted) return NextResponse.json({ error: 'Gagal menambah jamaah' }, { status: 500 })

    return NextResponse.json({ hewan, jamaah: inserted })
  }

  // ── Mode A: buat hewan baru + jamaah ──
  const { jenis_hewan, tipe_sapi, jamaah } = body as {
    jenis_hewan: JenisHewan
    tipe_sapi: 'A' | 'B' | null
    jamaah: JamaahFormData[]
  }

  let nextIndex: number

  if (jenis_hewan === 'SAPI' && tipe_sapi) {
    const tipePrefix = `SAPI-${tipe_sapi}`
    const { data: sapiTipeData } = await supabase
      .from('hewan')
      .select('kode_resi')
      .eq('id_workspace', profile.id_workspace)
      .eq('periode_id', periodeId)       // scope ke periode aktif saja
      .like('kode_resi', `${tipePrefix}%`)

    // Gunakan maxKodeNum agar tahan terhadap gap / soft-delete
    const nums = (sapiTipeData ?? []).map((r) => {
      const m = r.kode_resi.match(/(\d+)$/)
      return m ? parseInt(m[1], 10) : 0
    })
    nextIndex = (nums.length ? Math.max(...nums) : 0) + 1
  } else {
    const { data: kmbData } = await supabase
      .from('hewan')
      .select('kode_resi')
      .eq('id_workspace', profile.id_workspace)
      .eq('periode_id', periodeId)       // scope ke periode aktif saja
      .like('kode_resi', 'KMB-%')

    const nums = (kmbData ?? []).map((r) => {
      const m = r.kode_resi.match(/(\d+)$/)
      return m ? parseInt(m[1], 10) : 0
    })
    nextIndex = (nums.length ? Math.max(...nums) : 0) + 1
  }

  const kode_resi = generateKodeResi(jenis_hewan, nextIndex, tipe_sapi ?? 'A')

  const { data: hewan, error: hewanError } = await supabase
    .from('hewan')
    .insert({
      id_workspace: profile.id_workspace,
      periode_id: periodeId,
      kode_resi,
      kode_publik: '',
      jenis_hewan,
    })
    .select()
    .single()

  if (hewanError || !hewan)
    return NextResponse.json({ error: 'Gagal membuat data hewan' }, { status: 500 })

  const jamaahRows = jamaah
    .filter((j) => j.nama_lengkap.trim())
    .map((j) => ({
      id_workspace: profile.id_workspace,
      periode_id: periodeId,
      id_hewan: hewan.id,
      nama_lengkap: j.nama_lengkap.trim(),
      atas_nama: j.atas_nama?.trim() || null,
      no_hp: j.no_hp?.trim() || null,
      alamat_lengkap: j.alamat_lengkap?.trim() || null,
    }))

  const { error: jamaahError } = await supabase.from('jamaah').insert(jamaahRows)

  if (jamaahError) {
    await supabase.from('hewan').delete().eq('id', hewan.id)
    return NextResponse.json({ error: 'Gagal menyimpan data jamaah' }, { status: 500 })
  }

  return NextResponse.json({ hewan: { ...hewan, jamaah: [{ count: jamaahRows.length }] } })
}

// GET: ambil semua jamaah dalam satu hewan
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id_hewan = request.nextUrl.searchParams.get('id_hewan')
  if (!id_hewan) return NextResponse.json({ error: 'id_hewan wajib' }, { status: 400 })

  const { data } = await supabase
    .from('jamaah')
    .select('*')
    .eq('id_hewan', id_hewan)
    .is('deleted_at', null)
    .order('created_at')

  return NextResponse.json({ data: data ?? [] })
}

// PATCH: edit data jamaah
export async function PATCH(request: NextRequest) {
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

  const body = await request.json()
  const { id, nama_lengkap, atas_nama, no_hp, alamat_lengkap } = body as {
    id: string
    nama_lengkap: string
    atas_nama?: string
    no_hp?: string
    alamat_lengkap?: string
  }

  if (!id || !nama_lengkap?.trim())
    return NextResponse.json({ error: 'id dan nama_lengkap wajib diisi' }, { status: 400 })

  const { data, error } = await supabase
    .from('jamaah')
    .update({
      nama_lengkap: nama_lengkap.trim(),
      atas_nama: atas_nama?.trim() || null,
      no_hp: no_hp?.trim() || null,
      alamat_lengkap: alamat_lengkap?.trim() || null,
    })
    .eq('id', id)
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data)
    return NextResponse.json({ error: 'Gagal memperbarui data jamaah' }, { status: 500 })

  return NextResponse.json({ jamaah: data })
}

// PUT: pindah jamaah ke hewan lain
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

  const { id_jamaah, id_hewan_baru } = await request.json() as {
    id_jamaah: string
    id_hewan_baru: string
  }

  const { data: hewanTujuan } = await supabase
    .from('hewan')
    .select('id, jenis_hewan, kode_resi')
    .eq('id', id_hewan_baru)
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)
    .single()

  if (!hewanTujuan)
    return NextResponse.json({ error: 'Hewan tujuan tidak ditemukan' }, { status: 404 })

  const { count: jumlahDiTujuan } = await supabase
    .from('jamaah')
    .select('id', { count: 'exact', head: true })
    .eq('id_hewan', id_hewan_baru)
    .is('deleted_at', null)

  const maxSlot = hewanTujuan.jenis_hewan === 'SAPI' ? 7 : 1
  if ((jumlahDiTujuan ?? 0) >= maxSlot)
    return NextResponse.json({ error: `Slot hewan ${hewanTujuan.kode_resi} sudah penuh (maks. ${maxSlot})` }, { status: 409 })

  const { data, error } = await supabase
    .from('jamaah')
    .update({ id_hewan: id_hewan_baru })
    .eq('id', id_jamaah)
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data)
    return NextResponse.json({ error: 'Gagal memindahkan jamaah' }, { status: 500 })

  return NextResponse.json({ jamaah: data, kode_resi_baru: hewanTujuan.kode_resi })
}

// DELETE: hapus jamaah (soft delete)
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

  const { error } = await supabase
    .from('jamaah')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)

  if (error)
    return NextResponse.json({ error: 'Gagal menghapus jamaah' }, { status: 500 })

  return NextResponse.json({ success: true })
}
