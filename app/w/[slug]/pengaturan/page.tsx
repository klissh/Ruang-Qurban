import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PengaturanClient from './PengaturanClient'
import type { Kurir } from '@/types'

export default async function PengaturanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace, workspaces(id, nama, slug, created_at)')
    .eq('id', user.id).single()

  if (profile?.role !== 'SUPER_ADMIN') redirect(`/w/${slug}/analitik`)

  const [{ data: roles }, { data: kurirRaw }] = await Promise.all([
    supabase
      .from('workspace_roles')
      .select('id, nama, permissions, is_super_admin, created_at')
      .eq('workspace_id', profile.id_workspace)
      .order('created_at'),
    supabase
      .from('kurir')
      .select('id, nama, no_hp, created_at, updated_at')
      .eq('id_workspace', profile.id_workspace)
      .order('nama'),
  ])

  const workspace = profile.workspaces as any

  return (
    <PengaturanClient
      workspace={{ id: profile.id_workspace!, nama: workspace?.nama ?? '', slug: workspace?.slug ?? slug, created_at: workspace?.created_at ?? '' }}
      roles={roles ?? []}
      kurirList={(kurirRaw as Kurir[]) ?? []}
      slug={slug}
    />
  )
}
