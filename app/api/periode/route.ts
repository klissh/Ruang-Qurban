import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/periode — ambil semua periode di workspace (termasuk arsip)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile tidak ditemukan' }, { status: 403 })

  const { data, error } = await supabase
    .from('periode_qurban')
    .select('*')
    .eq('id_workspace', profile.id_workspace)
    .order('tahun', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

// POST /api/periode — buat periode baru (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Hanya SUPER_ADMIN yang bisa membuat periode baru' }, { status: 403 })

  const { tahun, nama_event } = await request.json() as { tahun: number; nama_event?: string }

  if (!tahun || tahun < 2020 || tahun > 2100)
    return NextResponse.json({ error: 'Tahun tidak valid' }, { status: 400 })

  // Panggil DB function (sudah handle validasi tidak boleh ada periode aktif)
  const { data, error } = await supabase.rpc('buat_periode_baru', {
    p_tahun: tahun,
    p_nama_event: nama_event ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Ambil data periode yang baru dibuat
  const { data: periode } = await supabase
    .from('periode_qurban')
    .select('*')
    .eq('id', data)
    .single()

  return NextResponse.json({ periode })
}
