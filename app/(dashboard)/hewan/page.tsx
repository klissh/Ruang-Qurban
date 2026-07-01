import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HewanClient from './HewanClient'

export default async function HewanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace, workspaces(nama)')
    .eq('id', user.id)
    .single()

  if (!profile || !['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'].includes(profile.role)) {
    redirect('/status')
  }

  const wid = profile.id_workspace!

  const { data: hewanRaw } = await supabase
    .from('hewan')
    .select('*')
    .eq('id_workspace', wid)
    .is('deleted_at', null)
    .order('jenis_hewan')
    .order('kode_resi')

  const { data: jamaahRaw } = await supabase
    .from('jamaah')
    .select('*')
    .eq('id_workspace', wid)
    .is('deleted_at', null)
    .order('created_at')

  const sapiCount = (hewanRaw ?? []).filter((h) => h.jenis_hewan === 'SAPI').length
  const kambingCount = (hewanRaw ?? []).filter((h) => h.jenis_hewan === 'KAMBING').length

  return (
    <HewanClient
      hewanList={hewanRaw ?? []}
      jamaahList={jamaahRaw ?? []}
      kambingCount={kambingCount}
      workspaceId={wid}
      namaWorkspace={(profile.workspaces as any)?.nama ?? ''}
    />
  )
}
