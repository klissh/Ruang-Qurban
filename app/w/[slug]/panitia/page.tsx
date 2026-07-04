import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PanitiaClient from './PanitiaClient'

export default async function PanitiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, id_workspace').eq('id', user.id).single()

  if (profile?.role !== 'SUPER_ADMIN') redirect(`/w/${slug}/analitik`)

  const { data: anggota } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, role, email, created_at, workspace_role_id, workspace_roles(id, nama)')
    .eq('id_workspace', profile.id_workspace)
    .order('nama_lengkap')

  const { data: workspaceRoles } = await supabase
    .from('workspace_roles')
    .select('id, nama, is_super_admin')
    .eq('workspace_id', profile.id_workspace)
    .order('created_at')

  return (
    <PanitiaClient
      anggotaList={anggota ?? []}
      workspaceRoles={workspaceRoles ?? []}
      currentUserId={user.id}
      workspaceId={profile.id_workspace!}
      slug={slug}
    />
  )
}
