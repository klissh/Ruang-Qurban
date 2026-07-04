import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STATUS_CONFIG } from '@/types'
import { formatTanggal } from '@/lib/utils'
import { Clock, Beef, PawPrint } from 'lucide-react'
import type { StatusHewan } from '@/types'

const G = {
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderTop: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '1.125rem',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
  } as React.CSSProperties,
}

const STATUS_DOT: Record<StatusHewan, string> = {
  TERDAFTAR: '#64748b',
  SAMPAI_MASJID: '#0ea5e9',
  MENUNGGU_SEMBELIH: '#64748b',
  SEDANG_DISEMBELIH: '#f59e0b',
  SUDAH_DISEMBELIH: '#f97316',
  PENCACAHAN: '#3b82f6',
  PACKING: '#6366f1',
  SELESAI: '#10b981',
}
const STATUS_COLOR: Record<StatusHewan, string> = {
  TERDAFTAR: '#94a3b8',
  SAMPAI_MASJID: '#38bdf8',
  MENUNGGU_SEMBELIH: '#94a3b8',
  SEDANG_DISEMBELIH: '#fbbf24',
  SUDAH_DISEMBELIH: '#fb923c',
  PENCACAHAN: '#60a5fa',
  PACKING: '#818cf8',
  SELESAI: '#34d399',
}

export default async function LogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, id_workspace').eq('id', user.id).single()

  if (!profile || !['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'].includes(profile.role)) {
    redirect(`/w/${slug}/status`)
  }

  const { data: logs } = await supabase
    .from('status_log')
    .select('id, nama_user, status_lama, status_baru, created_at, hewan(kode_resi, jenis_hewan)')
    .in('id_hewan',
      (await supabase.from('hewan').select('id').eq('id_workspace', profile.id_workspace))
        .data?.map((h) => h.id) ?? []
    )
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-6 md:p-8 pb-20 md:pb-8 max-w-3xl mx-auto animate-slide-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>
          Log Aktivitas
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>
          {logs?.length ?? 0} aktivitas terakhir
        </p>
      </div>

      <div style={G.card}>
        {logs && logs.length > 0 ? (
          logs.map((log, idx) => {
            const hewan = log.hewan as any
            const statusBaru = log.status_baru as StatusHewan
            const statusLama = log.status_lama as StatusHewan | null
            const dot = STATUS_DOT[statusBaru]
            const color = STATUS_COLOR[statusBaru]
            const label = STATUS_CONFIG[statusBaru]?.label ?? statusBaru
            const oldLabel = statusLama ? STATUS_CONFIG[statusLama]?.label : null
            const isSapi = hewan?.jenis_hewan === 'SAPI'

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '16px 22px',
                  borderBottom: idx < logs.length - 1 ? '1px solid rgba(255,255,255,0.045)' : 'none',
                  transition: 'background 0.15s',
                }}
              >
                {/* Dot */}
                <div style={{ marginTop: 7, flexShrink: 0 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: dot, boxShadow: `0 0 7px ${dot}99`,
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: '0 0 5px' }}>
                    <span style={{ fontWeight: 700 }}>{log.nama_user ?? 'Sistem'}</span>
                    {' '}mengubah{' '}
                    <span style={{
                      fontFamily: 'ui-monospace,monospace', fontWeight: 700,
                      color: 'rgba(255,255,255,0.88)',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '1px 7px', borderRadius: 5,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      {hewan?.kode_resi ?? '?'}
                    </span>
                    {' '}ke{' '}
                    <span style={{ fontWeight: 700, color }}>{label}</span>
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {oldLabel && (
                      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)' }}>
                        dari: {oldLabel}
                      </span>
                    )}
                    {oldLabel && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'inline-block' }} />}
                    <Clock size={11} color="rgba(255,255,255,0.22)" />
                    <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.26)' }}>
                      {formatTanggal(log.created_at)}
                    </span>
                    {hewan && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'inline-block' }} />
                        {isSapi
                          ? <Beef size={11} color="rgba(255,255,255,0.26)" />
                          : <PawPrint size={11} color="rgba(255,255,255,0.26)" />
                        }
                        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.26)' }}>{hewan.jenis_hewan}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <Clock size={32} color="rgba(255,255,255,0.14)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Belum ada aktivitas yang tercatat</p>
          </div>
        )}
      </div>
    </div>
  )
}
