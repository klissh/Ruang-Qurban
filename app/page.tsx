import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Query sederhana tanpa join yang bisa gagal karena RLS/migration
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.id_workspace) redirect('/waiting')

  // Get workspace slug secara terpisah
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('slug')
    .eq('id', profile.id_workspace)
    .single()

  const slug = workspace?.slug ?? 'default'
  const dest = profile.role === 'PETUGAS_LAPANGAN' ? 'status' : 'analitik'
  redirect(`/w/${slug}/${dest}`)
}
