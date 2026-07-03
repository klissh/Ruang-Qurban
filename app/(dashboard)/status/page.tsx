import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatusClient from './StatusClient'

function NoPeriodeState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, textAlign: 'center', padding: 24 }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Tidak Ada Periode Aktif</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', margin: 0 }}>Data akan muncul setelah periode aktif tersedia.</p>
    </div>
  )
}

export default async function StatusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile || !['SUPER_ADMIN', 'PETUGAS_LAPANGAN'].includes(profile.role)) {
    redirect('/analitik')
  }

  const { data: periodeAktif } = await supabase
    .from('periode_qurban')
    .select('id')
    .eq('id_workspace', profile.id_workspace)
    .eq('status', 'aktif')
    .single()

  if (!periodeAktif) return <NoPeriodeState />

  const { data: hewan } = await supabase
    .from('hewan')
    .select('id, kode_resi, jenis_hewan, status, url_dokumentasi')
    .eq('id_workspace', profile.id_workspace)
    .eq('periode_id', periodeAktif.id)
    .is('deleted_at', null)
    .order('jenis_hewan')
    .order('kode_resi')

  return <StatusClient hewanList={hewan ?? []} />
}
