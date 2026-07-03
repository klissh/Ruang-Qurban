import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/periode/arsipkan — tutup & arsipkan periode aktif (SUPER_ADMIN only)
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Hanya SUPER_ADMIN yang bisa mengarsipkan periode' }, { status: 403 })

  // DB function handle validasi + update atomik
  const { data: periode_id, error } = await supabase.rpc('arsipkan_periode_aktif')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true, periode_id })
}
