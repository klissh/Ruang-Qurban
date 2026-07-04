import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HewanClient from './HewanClient'
import type { Periode } from '@/types'

// Komponen empty state ketika tidak ada periode aktif
function NoPeriodeState({ isSuperAdmin, slug }: { isSuperAdmin: boolean; slug: string }) {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-slide-up">
      <div style={{
        marginTop: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32,
        }}>
          📦
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
            Tidak Ada Periode Aktif
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginTop: 8, lineHeight: 1.6 }}>
            Data periode sebelumnya sudah diarsipkan atau belum ada periode yang dibuat.
            {isSuperAdmin && <><br />Buat periode baru untuk mulai input data qurban tahun ini.</>}
          </p>
        </div>
        {isSuperAdmin && (
          <a
            href={`/w/${slug}/arsip`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              border: 'none', borderRadius: 12,
              color: 'white', fontSize: 13.5, fontWeight: 700,
              textDecoration: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(16,185,129,0.38)',
            }}
          >
            Kelola Periode di Halaman Arsip
          </a>
        )}
      </div>
    </div>
  )
}

export default async function HewanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace, workspaces(nama)')
    .eq('id', user.id)
    .single()

  if (!profile || !['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'].includes(profile.role)) {
    redirect(`/w/${slug}/status`)
  }

  const wid = profile.id_workspace!

  // Ambil periode aktif
  const { data: periodeAktif } = await supabase
    .from('periode_qurban')
    .select('*')
    .eq('id_workspace', wid)
    .eq('status', 'aktif')
    .single()

  // Tidak ada periode aktif → tampilkan empty state
  if (!periodeAktif) {
    return <NoPeriodeState isSuperAdmin={profile.role === 'SUPER_ADMIN'} slug={slug} />
  }

  const periode = periodeAktif as Periode

  // Query hewan & jamaah hanya untuk periode aktif
  const { data: hewanRaw } = await supabase
    .from('hewan')
    .select('*')
    .eq('id_workspace', wid)
    .eq('periode_id', periode.id)
    .is('deleted_at', null)
    .order('jenis_hewan')
    .order('kode_resi')

  const { data: jamaahRaw } = await supabase
    .from('jamaah')
    .select('*')
    .eq('id_workspace', wid)
    .eq('periode_id', periode.id)
    .is('deleted_at', null)
    .order('created_at')

  const kambingCount = (hewanRaw ?? []).filter((h) => h.jenis_hewan === 'KAMBING').length

  return (
    <HewanClient
      hewanList={hewanRaw ?? []}
      jamaahList={jamaahRaw ?? []}
      kambingCount={kambingCount}
      workspaceId={wid}
      namaWorkspace={(profile.workspaces as any)?.nama ?? ''}
      periode={periode}
      userRole={profile.role}
    />
  )
}
