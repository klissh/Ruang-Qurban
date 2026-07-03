import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Settings, Building2 } from 'lucide-react'

const G = {
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderTop: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '1.125rem',
    padding: 24,
  } as React.CSSProperties,
}

export default async function PengaturanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, id_workspace, workspaces(id, nama, slug, created_at)').eq('id', user.id).single()

  if (profile?.role !== 'SUPER_ADMIN') redirect(`/w/${slug}/analitik`)

  const workspace = profile.workspaces as any

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto animate-slide-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>Pengaturan Workspace</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>Informasi dan konfigurasi workspace Anda</p>
      </div>

      <div style={G.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} color="#34d399" />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>{workspace?.nama ?? '-'}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>ID: {profile.id_workspace}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {[
            { label: 'Nama Workspace', value: workspace?.nama ?? '-' },
            { label: 'Slug (URL)', value: `/${workspace?.slug ?? slug}` },
            { label: 'URL Dashboard', value: `/w/${workspace?.slug ?? slug}/analitik` },
            { label: 'Dibuat', value: workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 600, fontFamily: label === 'Slug (URL)' || label === 'URL Dashboard' ? 'monospace' : undefined }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 16, lineHeight: 1.6 }}>
        Untuk mengubah nama atau slug workspace, silakan hubungi administrator sistem.
        Pengelolaan anggota dapat dilakukan di halaman{' '}
        <a href={`/w/${slug}/panitia`} style={{ color: '#34d399' }}>Manajemen Anggota</a>.
      </p>
    </div>
  )
}
