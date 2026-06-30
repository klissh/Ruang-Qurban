import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PanitiaClient from './PanitiaClient'

export default async function PanitiaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, id_workspace').eq('id', user.id).single()

  if (profile?.role !== 'SUPER_ADMIN') redirect('/analitik')

  const { data: panitia } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, role, created_at')
    .eq('id_workspace', profile.id_workspace)
    .order('role')
    .order('nama_lengkap')

  return <PanitiaClient panitiaList={panitia ?? []} currentUserId={user.id} workspaceId={profile.id_workspace!} />
}
