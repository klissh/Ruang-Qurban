import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT — update role
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, id_workspace').eq('id', user.id).single()
  if (profile?.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { nama, permissions } = await request.json()

  const { data: role, error } = await supabase
    .from('workspace_roles')
    .update({ nama, permissions })
    .eq('id', id)
    .eq('workspace_id', profile.id_workspace)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ role })
}

// DELETE — hapus role
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, id_workspace').eq('id', user.id).single()
  if (profile?.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Cek bukan super admin role
  const { data: existingRole } = await supabase
    .from('workspace_roles').select('is_super_admin').eq('id', id).single()
  if (existingRole?.is_super_admin) return NextResponse.json({ error: 'Role Super Admin tidak bisa dihapus' }, { status: 400 })

  const { error } = await supabase
    .from('workspace_roles').delete()
    .eq('id', id).eq('workspace_id', profile.id_workspace)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
