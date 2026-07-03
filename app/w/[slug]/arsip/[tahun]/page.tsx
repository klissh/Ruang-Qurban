import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArsipDetailClient from './ArsipDetailClient'
import type { Periode } from '@/types'

interface Props {
  params: Promise<{ slug: string; tahun: string }>
}

export default async function ArsipDetailPage({ params }: Props) {
  const { slug, tahun: tahunStr } = await params
  const tahun = parseInt(tahunStr, 10)
  if (isNaN(tahun)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: periodeData } = await supabase
    .from('periode_qurban')
    .select('*')
    .eq('id_workspace', profile.id_workspace)
    .eq('tahun', tahun)
    .single()

  if (!periodeData) notFound()

  const periode = periodeData as Periode

  // Cek apakah ada periode aktif lain (untuk tombol "Buka Kembali")
  const { data: aktifLain } = await supabase
    .from('periode_qurban')
    .select('id')
    .eq('id_workspace', profile.id_workspace)
    .eq('status', 'aktif')
    .neq('id', periode.id)
    .single()

  const adaPeriodeAktifLain = !!aktifLain

  // Query hewan & jamaah untuk periode ini (read-only view)
  const { data: hewanRaw } = await supabase
    .from('hewan')
    .select('*')
    .eq('id_workspace', profile.id_workspace)
    .eq('periode_id', periode.id)
    .is('deleted_at', null)
    .order('jenis_hewan')
    .order('kode_resi')

  const { data: jamaahRaw } = await supabase
    .from('jamaah')
    .select('*')
    .eq('id_workspace', profile.id_workspace)
    .eq('periode_id', periode.id)
    .is('deleted_at', null)
    .order('created_at')

  return (
    <ArsipDetailClient
      periode={periode}
      hewanList={hewanRaw ?? []}
      jamaahList={jamaahRaw ?? []}
      userRole={profile.role}
      adaPeriodeAktifLain={adaPeriodeAktifLain}
      slug={slug}
    />
  )
}
