import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/periode/buka-kembali — buka arsip periode tertentu (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Hanya SUPER_ADMIN yang bisa membuka kembali arsip' }, { status: 403 })

  const { periode_id } = await request.json() as { periode_id: string }
  if (!periode_id)
    return NextResponse.json({ error: 'periode_id wajib diisi' }, { status: 400 })

  const { error } = await supabase.rpc('buka_kembali_arsip', { p_periode_id: periode_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
