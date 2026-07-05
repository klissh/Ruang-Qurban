import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — list semua kurir di workspace
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('id_workspace').eq('id', user.id).single()
  if (!profile?.id_workspace) return NextResponse.json({ kurir: [] })

  const { data } = await supabase
    .from('kurir')
    .select('id, nama, no_hp, created_at')
    .eq('id_workspace', profile.id_workspace)
    .order('nama')

  return NextResponse.json({ kurir: data ?? [] })
}

// POST — tambah kurir baru (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, id_workspace').eq('id', user.id).single()
  if (!profile || profile.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Hanya Super Admin yang bisa mengelola kurir' }, { status: 403 })

  const { nama, no_hp } = await request.json() as { nama: string; no_hp?: string }
  if (!nama?.trim()) return NextResponse.json({ error: 'Nama kurir wajib diisi' }, { status: 400 })

  const { data, error } = await supabase
    .from('kurir')
    .insert({ id_workspace: profile.id_workspace, nama: nama.trim(), no_hp: no_hp?.trim() || null })
    .select('id, nama, no_hp, created_at')
    .single()

  if (error) return NextResponse.json({ error: 'Gagal menambah kurir' }, { status: 500 })
  return NextResponse.json({ kurir: data })
}

// PATCH — update nama/no_hp kurir (SUPER_ADMIN only)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, id_workspace').eq('id', user.id).single()
  if (!profile || profile.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Hanya Super Admin yang bisa mengelola kurir' }, { status: 403 })

  const { id, nama, no_hp } = await request.json() as { id: string; nama: string; no_hp?: string }
  if (!id || !nama?.trim()) return NextResponse.json({ error: 'id dan nama wajib diisi' }, { status: 400 })

  const { data, error } = await supabase
    .from('kurir')
    .update({ nama: nama.trim(), no_hp: no_hp?.trim() || null })
    .eq('id', id)
    .eq('id_workspace', profile.id_workspace)
    .select('id, nama, no_hp, created_at')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Gagal mengupdate kurir' }, { status: 500 })
  return NextResponse.json({ kurir: data })
}

// DELETE — hapus kurir (SUPER_ADMIN only)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, id_workspace').eq('id', user.id).single()
  if (!profile || profile.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Hanya Super Admin yang bisa mengelola kurir' }, { status: 403 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })

  const { error } = await supabase.from('kurir').delete().eq('id', id).eq('id_workspace', profile.id_workspace)
  if (error) return NextResponse.json({ error: 'Gagal menghapus kurir' }, { status: 500 })
  return NextResponse.json({ success: true })
}
