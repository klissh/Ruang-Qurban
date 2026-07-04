import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STATUS_CONFIG, STATUS_ORDER } from '@/types'
import { Layers, Users, Beef, PawPrint, PieChart, Truck } from 'lucide-react'
import type { StatusHewan, StatusAntar } from '@/types'

const G = {
  card: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderTop: '1px solid rgba(255,255,255,0.16)',
    borderRadius: '1.125rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.07)',
  } as React.CSSProperties,
}

const STAT_ACCENT: Record<StatusHewan, { dot: string; bar: string; color: string }> = {
  TERDAFTAR:         { dot: '#64748b', bar: '#64748b', color: '#94a3b8' },
  SAMPAI_MASJID:     { dot: '#0ea5e9', bar: '#38bdf8', color: '#38bdf8' },
  MENUNGGU_SEMBELIH: { dot: '#64748b', bar: '#94a3b8', color: '#94a3b8' },
  SEDANG_DISEMBELIH: { dot: '#f59e0b', bar: '#f59e0b', color: '#fbbf24' },
  SUDAH_DISEMBELIH:  { dot: '#f97316', bar: '#fb923c', color: '#fb923c' },
  PENCACAHAN:        { dot: '#3b82f6', bar: '#60a5fa', color: '#60a5fa' },
  PACKING:           { dot: '#6366f1', bar: '#818cf8', color: '#818cf8' },
  SELESAI:           { dot: '#10b981', bar: '#34d399', color: '#34d399' },
}

function NoPeriodeState({ namaWorkspace }: { namaWorkspace: string }) {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-slide-up">
      <div className="mb-2">
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>Dashboard Analitik</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>{namaWorkspace}</p>
      </div>
      <div style={{ ...G.card, padding: 40, textAlign: 'center', marginTop: 32 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Tidak Ada Periode Aktif</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>Data analitik akan muncul setelah periode aktif tersedia.</p>
      </div>
    </div>
  )
}

export default async function AnalitikPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace, workspaces(nama)')
    .eq('id', user.id)
    .single()

  // PETUGAS_LAPANGAN tidak boleh akses analitik → redirect ke status
  // Kalau profile null, layout sudah menangani → tidak perlu redirect di sini
  if (profile?.role === 'PETUGAS_LAPANGAN') {
    redirect(`/w/${slug}/status`)
  }

  if (!profile || !profile.id_workspace) {
    redirect('/login')
  }

  const wid = profile.id_workspace!
  const namaWorkspace = (profile.workspaces as any)?.nama ?? ''

  const { data: periodeAktif } = await supabase
    .from('periode_qurban')
    .select('id, tahun, nama_event')
    .eq('id_workspace', wid)
    .eq('status', 'aktif')
    .single()

  if (!periodeAktif) return <NoPeriodeState namaWorkspace={namaWorkspace} />

  const { data: hewanData } = await supabase
    .from('hewan')
    .select('jenis_hewan, status')
    .eq('id_workspace', wid)
    .eq('periode_id', periodeAktif.id)
    .is('deleted_at', null)

  const { count: totalJamaah } = await supabase
    .from('jamaah')
    .select('id', { count: 'exact', head: true })
    .eq('id_workspace', wid)
    .eq('periode_id', periodeAktif.id)
    .is('deleted_at', null)

  // Status pengantaran — hanya jamaah dari hewan berstatus SELESAI (yang masuk halaman Pengantaran)
  const { data: jamaahAntarData } = await supabase
    .from('jamaah')
    .select('status_antar')
    .eq('id_workspace', wid)
    .eq('periode_id', periodeAktif.id)
    .is('deleted_at', null)
    .not('id_hewan', 'is', null)

  const jamaahAntar = jamaahAntarData ?? []
  const antarCounts: Record<StatusAntar, number> = {
    BELUM_DIANTAR:  jamaahAntar.filter((j) => j.status_antar === 'BELUM_DIANTAR').length,
    SEDANG_DIANTAR: jamaahAntar.filter((j) => j.status_antar === 'SEDANG_DIANTAR').length,
    SUDAH_DIANTAR:  jamaahAntar.filter((j) => j.status_antar === 'SUDAH_DIANTAR').length,
  }
  const totalAntar   = jamaahAntar.length
  const persenAntar  = totalAntar > 0 ? Math.round((antarCounts.SUDAH_DIANTAR / totalAntar) * 100) : 0

  const hewan = hewanData ?? []
  const totalSapi    = hewan.filter((h) => h.jenis_hewan === 'SAPI').length
  const totalKambing = hewan.filter((h) => h.jenis_hewan === 'KAMBING').length
  const totalHewan   = hewan.length

  const perStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = hewan.filter((h) => h.status === status).length
    return acc
  }, {} as Record<StatusHewan, number>)
  const persenSelesai = totalHewan > 0 ? Math.round((perStatus.SELESAI / totalHewan) * 100) : 0
  const labelPeriode = periodeAktif.nama_event ?? `Qurban ${periodeAktif.tahun}`

  const statCards = [
    { label: 'Total Hewan',  value: totalHewan,        icon: <Layers size={18} color="#34d399" />, accent: 'rgba(52,211,153,0.35)',   iconBg: 'rgba(16,185,129,0.14)' },
    { label: 'Total Jamaah', value: totalJamaah ?? 0,  icon: <Users size={18} color="#60a5fa" />,  accent: 'rgba(96,165,250,0.35)',   iconBg: 'rgba(96,165,250,0.14)' },
    { label: 'Sapi',         value: totalSapi,          icon: <Beef size={18} color="#fbbf24" />,   accent: 'rgba(251,191,36,0.35)',  iconBg: 'rgba(251,191,36,0.14)' },
    { label: 'Kambing',      value: totalKambing,       icon: <PawPrint size={18} color="#c4b5fd" />, accent: 'rgba(167,139,250,0.35)', iconBg: 'rgba(167,139,250,0.14)' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-5 animate-slide-up">
      <div className="mb-2">
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>Dashboard Analitik</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>{namaWorkspace} · {labelPeriode}</p>
      </div>

      {/* ── Progress bar row: Penyembelihan + Pengantaran ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Progress Penyembelihan */}
        <div style={{ ...G.card, padding: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -50, left: '5%', right: '5%', height: 100, background: 'radial-gradient(ellipse, rgba(16,185,129,0.07), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.88)', margin: 0 }}>Progress Penyembelihan</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{perStatus.SELESAI} dari {totalHewan} hewan siap distribusi</p>
            </div>
            <p style={{ fontSize: 46, fontWeight: 800, color: '#34d399', margin: 0, lineHeight: 1, letterSpacing: -2 }}>
              {persenSelesai}<span style={{ fontSize: 20, fontWeight: 600, opacity: 0.46 }}>%</span>
            </p>
          </div>
          <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${persenSelesai}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 99, boxShadow: '0 0 14px rgba(16,185,129,0.55)', transition: 'width 0.8s ease' }} />
          </div>
        </div>

        {/* Progress Pengantaran */}
        <div style={{ ...G.card, padding: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -50, left: '5%', right: '5%', height: 100, background: 'radial-gradient(ellipse, rgba(6,182,212,0.07), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.88)', margin: 0 }}>Progress Pengantaran</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{antarCounts.SUDAH_DIANTAR} dari {totalAntar} jamaah sudah menerima</p>
            </div>
            <p style={{ fontSize: 46, fontWeight: 800, color: '#06b6d4', margin: 0, lineHeight: 1, letterSpacing: -2 }}>
              {persenAntar}<span style={{ fontSize: 20, fontWeight: 600, opacity: 0.46 }}>%</span>
            </p>
          </div>
          <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${persenAntar}%`, background: 'linear-gradient(90deg,#0891b2,#06b6d4)', borderRadius: 99, boxShadow: '0 0 14px rgba(6,182,212,0.55)', transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ ...G.card, borderTop: `2px solid ${s.accent}`, padding: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>{s.icon}</div>
            <p style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.97)', margin: '0 0 6px', lineHeight: 1, letterSpacing: -1 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: 0, fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Breakdown row: Status Proses + Status Pengantaran ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Breakdown Per Status Proses */}
        <div style={{ ...G.card, padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.86)', margin: 0 }}>Breakdown Per Status</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20 }}>
              <PieChart size={12} color="rgba(255,255,255,0.38)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)' }}>{totalHewan} hewan</span>
            </div>
          </div>
          {(Object.keys(perStatus) as StatusHewan[]).map((status) => {
            const count = perStatus[status]
            const persen = totalHewan > 0 ? Math.round((count / totalHewan) * 100) : 0
            const acc = STAT_ACCENT[status]
            const label = STATUS_CONFIG[status].label
            return (
              <div key={status} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: acc.dot }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: acc.color }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>{count}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', minWidth: 38, textAlign: 'right' }}>({persen}%)</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${persen}%`, background: acc.bar, borderRadius: 99, boxShadow: `0 0 8px ${acc.bar}66`, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Breakdown Status Pengantaran */}
        <div style={{ ...G.card, padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.86)', margin: 0 }}>Status Pengantaran</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20 }}>
              <Truck size={12} color="rgba(255,255,255,0.38)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)' }}>{totalAntar} jamaah</span>
            </div>
          </div>

          {/* 3 stat mini cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 28 }}>
            {([
              { key: 'BELUM_DIANTAR',  label: 'Belum',   color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(148,163,184,0.2)' },
              { key: 'SEDANG_DIANTAR', label: 'Diantar', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(251,191,36,0.2)'  },
              { key: 'SUDAH_DIANTAR',  label: 'Selesai', color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(52,211,153,0.2)'  },
            ] as const).map(({ key, label, color, bg, border }) => (
              <div key={key} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 26, fontWeight: 800, color, margin: '0 0 4px', lineHeight: 1, letterSpacing: -1 }}>{antarCounts[key as StatusAntar]}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.36)', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* 3 progress bars */}
          {([
            { key: 'BELUM_DIANTAR',  label: 'Belum Diantar',   color: '#94a3b8', bar: '#64748b' },
            { key: 'SEDANG_DIANTAR', label: 'Sedang Diantar',  color: '#fbbf24', bar: '#f59e0b' },
            { key: 'SUDAH_DIANTAR',  label: 'Sudah Diantar',   color: '#34d399', bar: '#10b981' },
          ] as const).map(({ key, label, color, bar }) => {
            const count  = antarCounts[key as StatusAntar]
            const persen = totalAntar > 0 ? Math.round((count / totalAntar) * 100) : 0
            return (
              <div key={key} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: bar }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>{count}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', minWidth: 38, textAlign: 'right' }}>({persen}%)</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${persen}%`, background: bar, borderRadius: 99, boxShadow: `0 0 8px ${bar}66`, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
