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

  // Hanya jamaah yang hewannya sudah SELESAI (siap distribusi) yang muncul di sini
  const { data: jamaah } = await supabase
    .from('jamaah')
    .select(`
      id, nama_lengkap, atas_nama, no_hp, alamat_lengkap,
      kode_jamaah, status_antar, waktu_antar, diantar_oleh,
      id_hewan, hewan!inner ( id, kode_resi, jenis_hewan, status )
    `)
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)
    .eq('hewan.status', 'SELESAI')
    .order('kode_jamaah')

  return <PengantaranClient jamaahList={(jamaah as unknown as JamaahRow[]) ?? []} />
}
