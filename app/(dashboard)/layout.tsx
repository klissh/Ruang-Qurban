import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import type { Role } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware sudah menangani redirect ke /login,
  // tapi ini sebagai defense-in-depth di level server component
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nama_lengkap, role, id_workspace, workspaces(nama)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: 'rgba(255,255,255,0.9)',
      }}
    >
      {/* Background orbs (dekoratif) */}
      <div
        className="pointer-events-none fixed"
        style={{
          top: '-20%', left: '-15%',
          width: 900, height: 900, zIndex: 0,
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 62%)',
        }}
      />
      <div
        className="pointer-events-none fixed"
        style={{
          bottom: '-25%', right: '-10%',
          width: 1000, height: 1000, zIndex: 0,
          background: 'radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 62%)',
        }}
      />

      {/* Sidebar */}
      <Sidebar
        role={profile.role as Role}
        namaUser={profile.nama_lengkap}
        namaWorkspace={(profile.workspaces as any)?.nama ?? ''}
      />

      {/* Konten */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {children}
      </main>
    </div>
  )
}
