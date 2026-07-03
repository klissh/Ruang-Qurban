import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PanitiaClient from './PanitiaClient'

export default async function PanitiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, id_workspace').eq('id', user.id).single()

  if (profile?.role !== 'SUPER_ADMIN') redirect(`/w/${slug}/analitik`)

  const { data: anggota } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, role, email, created_at')
    .eq('id_workspace', profile.id_workspace)
    .order('role')
    .order('nama_lengkap')

  return (
    <PanitiaClient
      anggotaList={anggota ?? []}
      currentUserId={user.id}
      workspaceId={profile.id_workspace!}
      slug={slug}
    />
  )
}
