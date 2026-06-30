import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STATUS_CONFIG } from '@/types'
import type { StatusHewan } from '@/types'

export default async function AnalitikPage() {
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

  // Hitung statistik
  const { data: hewanData } = await supabase
    .from('hewan')
    .select('jenis_hewan, status')
    .eq('id_workspace', wid)
    .is('deleted_at', null)

  const { count: totalJamaah } = await supabase
    .from('jamaah')
    .select('id', { count: 'exact', head: true })
    .eq('id_workspace', wid)
    .is('deleted_at', null)

  const hewan = hewanData ?? []
  const totalSapi = hewan.filter((h) => h.jenis_hewan === 'SAPI').length
  const totalKambing = hewan.filter((h) => h.jenis_hewan === 'KAMBING').length
  const totalHewan = hewan.length

  const perStatus = {
    BELUM_DISEMBELIH: hewan.filter((h) => h.status === 'BELUM_DISEMBELIH').length,
    SEDANG_DISEMBELIH: hewan.filter((h) => h.status === 'SEDANG_DISEMBELIH').length,
    PENCACAHAN: hewan.filter((h) => h.status === 'PENCACAHAN').length,
    SELESAI: hewan.filter((h) => h.status === 'SELESAI').length,
  }

  const persenSelesai = totalHewan > 0 ? Math.round((perStatus.SELESAI / totalHewan) * 100) : 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Analitik</h1>
        <p className="text-gray-500 text-sm mt-1">{(profile.workspaces as any)?.nama}</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Progress Penyembelihan</h2>
          <span className="text-2xl font-bold text-emerald-600">{persenSelesai}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${persenSelesai}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{perStatus.SELESAI} dari {totalHewan} hewan selesai</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalHewan}</p>
          <p className="text-sm text-gray-400 mt-1">Total Hewan</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalJamaah ?? 0}</p>
          <p className="text-sm text-gray-400 mt-1">Total Jamaah</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">🐄 {totalSapi}</p>
          <p className="text-sm text-gray-400 mt-1">Sapi</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">🐐 {totalKambing}</p>
          <p className="text-sm text-gray-400 mt-1">Kambing</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-5">Breakdown Per Status</h2>
        <div className="space-y-4">
          {(Object.keys(perStatus) as StatusHewan[]).map((status) => {
            const count = perStatus[status]
            const config = STATUS_CONFIG[status]
            const persen = totalHewan > 0 ? Math.round((count / totalHewan) * 100) : 0
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                  <span className="text-sm font-bold text-gray-700">{count} <span className="text-gray-400 font-normal">({persen}%)</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      status === 'SELESAI' ? 'bg-emerald-500' :
                      status === 'PENCACAHAN' ? 'bg-blue-400' :
                      status === 'SEDANG_DISEMBELIH' ? 'bg-amber-400' :
                      'bg-gray-300'
                    }`}
                    style={{ width: `${persen}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
