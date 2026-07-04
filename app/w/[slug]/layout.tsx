import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import type { Role } from '@/types'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  // Decode URL encoding (misal Masjid%20Ar-Ridho → Masjid Ar-Ridho)
  const slug = decodeURIComponent(rawSlug)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('nama_lengkap, role, id_workspace, workspaces(id, nama, slug)')
    .eq('id', user.id)
    .single()

  // Tidak ada profil → login
  if (profileError || !profile) redirect('/login')

  // Belum punya workspace → tunggu
  if (!profile.id_workspace) redirect('/waiting')

  const workspace = profile.workspaces as any

  // Kalau slug di URL tidak cocok dengan workspace user, redirect ke slug yang benar
  if (workspace?.slug && decodeURIComponent(workspace.slug) !== slug) {
    const dest = profile.role === 'PETUGAS_LAPANGAN' ? 'status' : 'analitik'
    redirect(`/w/${workspace.slug}/${dest}`)
  }

  const workspaceSlug = workspace?.slug ?? slug

  const contextValue = {
    workspaceId: profile.id_workspace,
    slug: workspaceSlug,
    namaWorkspace: workspace?.nama ?? '',
    userId: user.id,
    namaUser: profile.nama_lengkap,
    role: profile.role as Role,
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
          role={profile.role as Role}
          namaUser={profile.nama_lengkap}
          namaWorkspace={workspace?.nama ?? ''}
          slug={workspaceSlug}
        />

        <main className="flex-1 overflow-y-auto relative z-10">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  )
}
