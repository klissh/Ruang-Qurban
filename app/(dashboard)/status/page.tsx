import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatusClient from './StatusClient'

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

  const { data: hewan } = await supabase
    .from('hewan')
    .select('id, kode_resi, jenis_hewan, status, url_dokumentasi')
    .eq('id_workspace', profile.id_workspace)
    .is('deleted_at', null)
    .order('jenis_hewan')
    .order('kode_resi')

  return <StatusClient hewanList={hewan ?? []} />
}
