import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import { resolvePermissions } from '@/lib/permissions'
import { SUPER_ADMIN_PERMISSIONS } from '@/context/WorkspaceContext'
import type { Role } from '@/types'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Query utama (dengan workspace_role jika migration 005 sudah jalan) ──
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('nama_lengkap, role, id_workspace, workspace_role_id, workspace_roles(permissions), workspaces(id, nama, slug)')
    .eq('id', user.id)
    .single()

  // ── Fallback: jika query gagal (misal kolom belum ada), pakai query sederhana ──
  let finalProfile: any = profile
  if (profileError || !profile) {
    const { data: basicProfile } = await supabase
      .from('profiles')
      .select('nama_lengkap, role, id_workspace, workspaces(id, nama, slug)')
      .eq('id', user.id)
      .single()
    finalProfile = basicProfile
  }

  if (!finalProfile) redirect('/login')
  if (!finalProfile.id_workspace) redirect('/waiting')

  const workspace = finalProfile.workspaces as any

  if (workspace?.slug && decodeURIComponent(workspace.slug) !== slug) {
    const dest = finalProfile.role === 'PETUGAS_LAPANGAN' ? 'status' : 'analitik'
    redirect(`/w/${workspace.slug}/${dest}`)
  }

  const workspaceSlug = workspace?.slug ?? slug
  const wrPerms = (finalProfile.workspace_roles as any)?.permissions ?? null
  const permissions = resolvePermissions(finalProfile.role, wrPerms)

  const contextValue = {
    workspaceId:   finalProfile.id_workspace,
    slug:          workspaceSlug,
    namaWorkspace: workspace?.nama ?? '',
    userId:        user.id,
    namaUser:      finalProfile.nama_lengkap,
    role:          finalProfile.role as Role,
    permissions,
  }

  return (
    <WorkspaceProvider value={contextValue}>
      <div
        className="flex h-screen overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.9)',
        }}
      >
        <div className="pointer-events-none fixed" style={{ top: '-20%', left: '-15%', width: 900, height: 900, zIndex: 0, background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 62%)' }} />
        <div className="pointer-events-none fixed" style={{ bottom: '-25%', right: '-10%', width: 1000, height: 1000, zIndex: 0, background: 'radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 62%)' }} />

        <Sidebar
          role={finalProfile.role as Role}
          namaUser={finalProfile.nama_lengkap}
          namaWorkspace={workspace?.nama ?? ''}
          slug={workspaceSlug}
          permissions={permissions}
        />

        <main className="flex-1 overflow-y-auto relative z-10">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  )
}
