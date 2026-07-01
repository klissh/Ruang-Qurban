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

  const body = await request.json()
  const { jenis_hewan, tipe_sapi, jamaah } = body as {
    jenis_hewan: JenisHewan
    tipe_sapi: 'A' | 'B' | null
    jamaah: JamaahFormData[]
  }

  // Hitung jumlah hewan untuk generate kode yang tepat
  let nextIndex: number

  if (jenis_hewan === 'SAPI' && tipe_sapi) {
    // Hitung hanya sapi dengan tipe yang sama (berdasarkan prefix kode)
    const tipePrefix = `SAPI-${tipe_sapi}`
    const { data: sapiTipeData } = await supabase
      .from('hewan')
      .select('kode_resi')
      .eq('id_workspace', profile.id_workspace)
      .eq('jenis_hewan', 'SAPI')
      .like('kode_resi', `${tipePrefix}%`)
      .is('deleted_at', null)

    const countTipe = sapiTipeData?.length ?? 0
    // Langsung pakai count tipe itu sendiri — tanpa batas atas
    nextIndex = countTipe + 1
  } else {
    // Kambing: hitung total kambing
    const { count } = await supabase
      .from('hewan')
      .select('id', { count: 'exact', head: true })
      .eq('id_workspace', profile.id_workspace)
      .eq('jenis_hewan', jenis_hewan)
      .is('deleted_at', null)
    nextIndex = (count ?? 0) + 1
  }

  const kode_resi = generateKodeResi(jenis_hewan, nextIndex, tipe_sapi ?? 'A')

  // Insert hewan (kode_publik akan di-generate otomatis oleh trigger DB)
  const { data: hewan, error: hewanError } = await supabase
    .from('hewan')
    .insert({
      id_workspace: profile.id_workspace,
      kode_resi,
      kode_publik: '',  // trigger DB akan mengisi ini
      jenis_hewan,
    })
    .select()
    .single()

  if (hewanError || !hewan) {
    return NextResponse.json({ error: 'Gagal membuat data hewan' }, { status: 500 })
  }

  // Insert jamaah
  const jamaahRows = jamaah
    .filter((j) => j.nama_lengkap.trim())
    .map((j) => ({
      id_workspace: profile.id_workspace,
      id_hewan: hewan.id,
      nama_lengkap: j.nama_lengkap.trim(),
      atas_nama: j.atas_nama?.trim() || null,
      no_hp: j.no_hp?.trim() || null,
      alamat_lengkap: j.alamat_lengkap?.trim() || null,
    }))

  const { error: jamaahError } = await supabase
    .from('jamaah')
    .insert(jamaahRows)

  if (jamaahError) {
    // Rollback hewan jika jamaah gagal
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

  // Validasi hewan tujuan: harus ada, milik workspace ini, belum dihapus
  const { data: hewanTujuan } = await supabase
    .from('hewan')
    .select('id, jenis_hewan, kode_resi')
    .eq('id', id_hewan_baru)
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)
    .single()

  if (!hewanTujuan)
    return NextResponse.json({ error: 'Hewan tujuan tidak ditemukan' }, { status: 404 })

  // Hitung jumlah jamaah aktif di hewan tujuan
  const { count: jumlahDiTujuan } = await supabase
    .from('jamaah')
    .select('id', { count: 'exact', head: true })
    .eq('id_hewan', id_hewan_baru)
    .is('deleted_at', null)

  const maxSlot = hewanTujuan.jenis_hewan === 'SAPI' ? 7 : 1
  if ((jumlahDiTujuan ?? 0) >= maxSlot)
    return NextResponse.json({ error: `Slot hewan ${hewanTujuan.kode_resi} sudah penuh (maks. ${maxSlot})` }, { status: 409 })

  // Pindahkan jamaah
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
