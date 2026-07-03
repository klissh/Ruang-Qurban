import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PengantaranClient from './PengantaranClient'
import type { StatusAntar, JenisHewan } from '@/types'

interface JamaahRow {
  id: string
  nama_lengkap: string
  atas_nama: string | null
  no_hp: string | null
  alamat_lengkap: string | null
  kode_jamaah: string | null
  status_antar: StatusAntar
  waktu_antar: string | null
  diantar_oleh: string | null
  id_hewan: string | null
  hewan: { id: string; kode_resi: string; jenis_hewan: JenisHewan; status: string } | { id: string; kode_resi: string; jenis_hewan: JenisHewan; status: string }[] | null
}

function NoPeriodeState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, textAlign: 'center', padding: 24 }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Tidak Ada Periode Aktif</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', margin: 0 }}>Data akan muncul setelah periode aktif tersedia.</p>
    </div>
  )
}

export default async function PengantaranPage() {
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

  const { data: jamaah } = await supabase
    .from('jamaah')
    .select(`
      id, nama_lengkap, atas_nama, no_hp, alamat_lengkap,
      kode_jamaah, status_antar, waktu_antar, diantar_oleh,
      id_hewan, hewan!inner ( id, kode_resi, jenis_hewan, status )
    `)
    .eq('id_workspace', profile.id_workspace)
    .eq('periode_id', periodeAktif.id)
    .is('deleted_at', null)
    .eq('hewan.status', 'SELESAI')
    .order('kode_jamaah')

  return <PengantaranClient jamaahList={(jamaah as unknown as JamaahRow[]) ?? []} />
}
