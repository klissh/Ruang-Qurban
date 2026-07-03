import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace, workspaces(slug)')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.id_workspace) redirect('/waiting')

  const ws = profile.workspaces as any
  const slug = ws?.slug ?? 'default'
  const dest = profile.role === 'PETUGAS_LAPANGAN' ? 'status' : 'analitik'
  redirect(`/w/${slug}/${dest}`)
}
