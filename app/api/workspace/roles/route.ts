import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET — list roles workspace
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('id_workspace').eq('id', user.id).single()
  if (!profile?.id_workspace) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const { data: roles } = await supabase
    .from('workspace_roles')
    .select('id, nama, permissions, is_super_admin, created_at')
    .eq('workspace_id', profile.id_workspace)
    .order('created_at')

  return NextResponse.json({ roles: roles ?? [] })
}

// POST — buat role baru
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, id_workspace').eq('id', user.id).single()
  if (profile?.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { nama, permissions } = await request.json()
  if (!nama) return NextResponse.json({ error: 'Nama role wajib diisi' }, { status: 400 })

  const { data: role, error } = await supabase
    .from('workspace_roles')
    .insert({ workspace_id: profile.id_workspace, nama, permissions })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ role })
}
