import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STATUS_CONFIG } from '@/types'
import { formatTanggal } from '@/lib/utils'
import type { StatusHewan } from '@/types'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, id_workspace').eq('id', user.id).single()

  if (!profile || !['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'].includes(profile.role)) {
    redirect('/status')
  }

  // Ambil 100 log terakhir beserta info hewan
  const { data: logs } = await supabase
    .from('status_log')
    .select(`
      id, nama_user, status_lama, status_baru, created_at,
      hewan(kode_resi, jenis_hewan)
    `)
    .in('id_hewan',
      (await supabase
        .from('hewan')
        .select('id')
        .eq('id_workspace', profile.id_workspace)
      ).data?.map(h => h.id) ?? []
    )
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Log Aktivitas</h1>
        <p className="text-gray-500 text-sm mt-1">{logs?.length ?? 0} aktivitas terakhir</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {logs && logs.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const hewan = log.hewan as any
              const newConfig = STATUS_CONFIG[log.status_baru as StatusHewan]
              const oldConfig = log.status_lama ? STATUS_CONFIG[log.status_lama as StatusHewan] : null

              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition">
                  {/* Dot */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                    log.status_baru === 'SELESAI' ? 'bg-emerald-500' :
                    log.status_baru === 'SEDANG_DISEMBELIH' ? 'bg-amber-400' :
                    log.status_baru === 'PENCACAHAN' ? 'bg-blue-400' : 'bg-gray-300'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">{log.nama_user ?? 'Sistem'}</span>
                        {' '}mengubah{' '}
                        <span className="font-mono font-semibold text-gray-900">
                          {hewan?.kode_resi ?? '?'}
                        </span>
                        {' '}ke{' '}
                        <span className={`font-semibold ${newConfig?.color}`}>
                          {newConfig?.label}
                        </span>
                      </p>
                    </div>

                    {oldConfig && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Sebelumnya: {oldConfig.label}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      {formatTanggal(log.created_at)}
                      {hewan && (
                        <span className="ml-2 text-gray-300">
                          • {hewan.jenis_hewan === 'SAPI' ? '🐄' : '🐐'} {hewan.jenis_hewan}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400 text-sm">
            Belum ada aktivitas yang tercatat
          </div>
        )}
      </div>
    </div>
  )
}
