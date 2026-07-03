import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Periode } from '@/types'
import ArsipPageClient from './ArsipPageClient'

export default async function ArsipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: allPeriode } = await supabase
    .from('periode_qurban')
    .select('*')
    .eq('id_workspace', profile.id_workspace)
    .order('tahun', { ascending: false })

  const periode = (allPeriode ?? []) as Periode[]

  return (
    <ArsipPageClient
      periodeList={periode}
      isSuperAdmin={profile.role === 'SUPER_ADMIN'}
      slug={slug}
    />
  )
}
