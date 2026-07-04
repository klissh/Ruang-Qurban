'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { STATUS_CONFIG, STATUS_ORDER, STATUS_ANTAR_CONFIG } from '@/types'
import type { StatusHewan, JenisHewan, StatusAntar } from '@/types'
import { Moon, Search, Beef, PawPrint, Check, Video, AlertCircle, Loader2, Truck, Clock, Download, Users } from 'lucide-react'

interface TrackingData {
  kode_resi: string
  jenis_hewan: JenisHewan
  status: StatusHewan
  url_dokumentasi: string | null
  nama_workspace: string
  jamaah: Array<{
    id: string
    nama_lengkap: string
    atas_nama: string | null
    kode_jamaah: string | null
    status_antar: StatusAntar
    diantar_oleh: string | null
  }>
  workspace_stats: {
    totalSapi: number
    totalKambing: number
    totalJamaah: number
    labelPeriode: string
  }
}

const STATUS_GLASS: Record<StatusHewan, { color: string; bg: string; border: string; dot: string }> = {
  TERDAFTAR:         { color: '#94a3b8', bg: 'rgba(100,116,139,0.14)', border: 'rgba(148,163,184,0.22)', dot: '#64748b' },
  SAMPAI_MASJID:     { color: '#38bdf8', bg: 'rgba(14,165,233,0.14)',  border: 'rgba(56,189,248,0.22)',  dot: '#0ea5e9' },
  MENUNGGU_SEMBELIH: { color: '#94a3b8', bg: 'rgba(100,116,139,0.14)', border: 'rgba(148,163,184,0.22)', dot: '#64748b' },
  SEDANG_DISEMBELIH: { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)',  border: 'rgba(251,191,36,0.22)',  dot: '#f59e0b' },
  SUDAH_DISEMBELIH:  { color: '#fb923c', bg: 'rgba(249,115,22,0.14)',  border: 'rgba(251,146,60,0.22)',  dot: '#f97316' },
  PENCACAHAN:        { color: '#60a5fa', bg: 'rgba(59,130,246,0.14)',   border: 'rgba(96,165,250,0.22)',  dot: '#3b82f6' },
  PACKING:           { color: '#818cf8', bg: 'rgba(99,102,241,0.14)',   border: 'rgba(129,140,248,0.22)', dot: '#6366f1' },
  SELESAI:           { color: '#34d399', bg: 'rgba(16,185,129,0.14)',   border: 'rgba(52,211,153,0.22)',  dot: '#10b981' },
}

// Agregat status pengantaran satu kelompok (sapi bisa beda-beda per orang)
function computeStatusPengantaran(jamaah: TrackingData['jamaah']): { status: StatusAntar; sudah: number; total: number } {
  const total = jamaah.length
  if (total === 0) return { status: 'BELUM_DIANTAR', sudah: 0, total: 0 }
  const sudah = jamaah.filter((j) => j.status_antar === 'SUDAH_DIANTAR').length
  if (sudah === total) return { status: 'SUDAH_DIANTAR', sudah, total }
  const sedangProses = jamaah.some((j) => j.status_antar !== 'BELUM_DIANTAR')
  if (sedangProses) return { status: 'SEDANG_DIANTAR', sudah, total }
  return { status: 'BELUM_DIANTAR', sudah, total }
}

interface Palette { color: string; bg: string; border: string; dot: string }
interface StepItem {
  key: string
  label: string
  subLabel?: string
  state: 'done' | 'active' | 'upcoming'
  palette: Palette
  icon?: React.ReactNode
}

const DONE_PALETTE: Palette = STATUS_GLASS.SELESAI
const UPCOMING_PALETTE: Palette = { color: 'rgba(255,255,255,0.2)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)', dot: 'rgba(255,255,255,0.12)' }

// Susun 10 langkah: 8 tahap proses hewan + 1 langkah Pengantaran (dinamis
// belum/sedang/sudah diantar) + 1 langkah penutup "Selesai".
// Aturan warna: sudah lewat -> selalu hijau, sedang berlangsung -> warna kategorinya,
// belum sampai -> abu-abu.
function buildSteps(result: TrackingData, statusPengantaran: { status: StatusAntar; sudah: number; total: number }): StepItem[] {
  const currentHewanStep = STATUS_CONFIG[result.status].step
  const steps: StepItem[] = STATUS_ORDER.map((status) => {
    const cfg = STATUS_CONFIG[status]
    const sg = STATUS_GLASS[status]
    const isSelesaiHewan = status === 'SELESAI'
    let state: StepItem['state']
    if (cfg.step < currentHewanStep) state = 'done'
    else if (cfg.step === currentHewanStep) state = isSelesaiHewan ? 'done' : 'active'
    else state = 'upcoming'
    return { key: status, label: cfg.label, state, palette: sg }
  })

  const pengantaranReached = currentHewanStep >= STATUS_CONFIG.SELESAI.step
  const da = STATUS_ANTAR_CONFIG[statusPengantaran.status]
  const { sudah, total } = statusPengantaran
  let pengantaranState: StepItem['state'] = 'upcoming'
  let pengantaranSub: string | undefined
  if (pengantaranReached) {
    pengantaranState = statusPengantaran.status === 'SUDAH_DIANTAR' ? 'done' : 'active'
    if (statusPengantaran.status === 'SEDANG_DIANTAR') {
      // Kurirnya bisa beda-beda per orang (terutama kelompok sapi) — detail siapa
      // mengantar siapa dilihat di Daftar Pengqurban, di sini cukup progress-nya
      pengantaranSub = total > 1
        ? (sudah > 0 ? `${sudah} dari ${total} orang sudah diterima` : 'Sedang diantar ke alamat jamaah')
        : 'Sedang dalam perjalanan'
    } else if (statusPengantaran.status === 'BELUM_DIANTAR') {
      pengantaranSub = 'Menunggu diantar ke alamat Anda'
    }
  }
  steps.push({
    key: 'PENGANTARAN', label: da.label, subLabel: pengantaranSub, state: pengantaranState,
    palette: da, icon: pengantaranState === 'active'
      ? (statusPengantaran.status === 'SEDANG_DIANTAR' ? <Truck size={14} /> : <Clock size={14} />)
      : undefined,
  })

  const finalDone = pengantaranReached && statusPengantaran.status === 'SUDAH_DIANTAR'
  steps.push({
    key: 'FINAL_SELESAI', label: 'Selesai',
    subLabel: finalDone ? 'Selamat menikmati daging qurban' : undefined,
    state: finalDone ? 'done' : 'upcoming',
    palette: DONE_PALETTE,
  })

  return steps
}

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

export default function TrackingPage() {
  const searchParams = useSearchParams()
  const [kode, setKode] = useState(searchParams.get('kode') ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackingData | null>(null)
  const [error, setError] = useState('')
  const [activeCode, setActiveCode] = useState('')

  const handleSearch = useCallback(async (searchKode?: string) => {
    const q = (searchKode ?? kode).trim().toUpperCase()
    if (!q) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/tracking?kode=${encodeURIComponent(q)}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Terjadi kesalahan. Coba lagi.'); setActiveCode('') }
      else { setResult(json.data); setActiveCode(q) }
    } catch {
      setError('Koneksi gagal. Periksa internet Anda.')
      setActiveCode('')
    } finally {
      setLoading(false)
    }
  }, [kode])

  useEffect(() => {
    const paramKode = searchParams.get('kode')
    if (paramKode) { setKode(paramKode); handleSearch(paramKode) }
  }, []) // eslint-disable-line

  // Auto-refresh diam-diam tiap 30 detik selagi ada hasil aktif, supaya
  // perubahan status pengantaran dari panitia langsung kelihatan tanpa
  // jamaah harus pencet "Cek" ulang
  useEffect(() => {
    if (!activeCode) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tracking?kode=${encodeURIComponent(activeCode)}`)
        if (res.ok) {
          const json = await res.json()
          setResult(json.data)
        }
      } catch {
        // diamkan — biarkan data lama tetap tampil, coba lagi 30 detik berikutnya
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [activeCode])

  const statusPengantaran = result ? computeStatusPengantaran(result.jamaah) : null
  const steps = result && statusPengantaran ? buildSteps(result, statusPengantaran) : []

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: 'rgba(255,255,255,0.9)',
      }}
    >
      {/* BG orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-15%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-25%', right: '-10%', width: 800, height: 800, background: 'radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(4,10,7,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            padding: 5,
          }}>
            <img src="/logo.png" alt="Ruang Qurban" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h1 style={{ fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,0.95)', margin: 0, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Portal Tracking Qurban
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', margin: '2px 0 0' }}>Cek status hewan qurban Anda</p>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Auth buttons */}
          <div className="tracking-auth" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a
              href="/login"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 13, fontWeight: 600,
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              Masuk
            </a>
            <a
              href="/register"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 10,
                background: 'linear-gradient(135deg,#10b981,#059669)',
                border: 'none',
                color: 'white',
                fontSize: 13, fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              }}
            >
              Daftar
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px 48px', position: 'relative', zIndex: 1 }}>

        {/* Search card */}
        <div style={{ ...G.card, padding: 24, marginBottom: 20, maxWidth: 560, margin: '0 auto 20px' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
            Masukkan Kode Resi Qurban Anda
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.28)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={kode}
                onChange={(e) => setKode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Contoh: X7KQ-2M9R"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.9)',
                  borderRadius: 12, padding: '12px 14px 12px 44px',
                  fontSize: 14, fontFamily: 'ui-monospace,monospace',
                  letterSpacing: '0.05em', outline: 'none', textTransform: 'uppercase',
                }}
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !kode.trim()}
              style={{
                padding: '12px 20px',
                background: loading || !kode.trim()
                  ? 'rgba(16,185,129,0.3)'
                  : 'linear-gradient(135deg,#10b981,#059669)',
                border: 'none', borderRadius: 12, color: 'white',
                fontWeight: 700, fontSize: 14, cursor: loading || !kode.trim() ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={15} />}
              Cek
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, fontSize: 13, color: '#fca5a5',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Info hewan */}
            <div style={{ ...G.card, padding: 24, maxWidth: 560, margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>Kode Hewan</p>
                  <p style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 800, fontSize: 26, color: 'rgba(255,255,255,0.97)', margin: '6px 0 8px', letterSpacing: '-0.5px' }}>
                    {result.kode_resi}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {result.jenis_hewan === 'SAPI'
                      ? <Beef size={14} color="rgba(255,255,255,0.45)" />
                      : <PawPrint size={14} color="rgba(255,255,255,0.45)" />
                    }
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                      {result.jenis_hewan} · {result.nama_workspace}
                    </span>
                  </div>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', padding: '5px 12px',
                  borderRadius: 20, fontSize: 12, fontWeight: 700, flexShrink: 0,
                  background: STATUS_GLASS[result.status].bg,
                  color: STATUS_GLASS[result.status].color,
                  border: `1px solid ${STATUS_GLASS[result.status].border}`,
                }}>
                  {STATUS_CONFIG[result.status].labelShort}
                </div>
              </div>
            </div>

            {/* Statistik Workspace — simetris 3 kolom */}
            {result.workspace_stats?.labelPeriode && (
              <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
                {/* Header workspace */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingInline: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    {result.nama_workspace}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
                    {result.workspace_stats.labelPeriode}
                  </span>
                </div>

                {/* 3 kartu statistik simetris */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    {
                      label: 'Total Sapi',
                      value: result.workspace_stats.totalSapi,
                      icon: <Beef size={18} color="#fbbf24" />,
                      iconBg: 'rgba(251,191,36,0.12)',
                      accent: 'rgba(251,191,36,0.3)',
                      color: '#fbbf24',
                    },
                    {
                      label: 'Total Kambing',
                      value: result.workspace_stats.totalKambing,
                      icon: <PawPrint size={18} color="#c4b5fd" />,
                      iconBg: 'rgba(167,139,250,0.12)',
                      accent: 'rgba(167,139,250,0.3)',
                      color: '#c4b5fd',
                    },
                    {
                      label: 'Total Jamaah',
                      value: result.workspace_stats.totalJamaah,
                      icon: <Users size={18} color="#60a5fa" />,
                      iconBg: 'rgba(96,165,250,0.12)',
                      accent: 'rgba(96,165,250,0.3)',
                      color: '#60a5fa',
                    },
                  ].map((s) => (
                    <div key={s.label} style={{
                      ...G.card,
                      borderTop: `2px solid ${s.accent}`,
                      padding: '16px 14px',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: s.iconBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {s.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', margin: '0 0 3px', lineHeight: 1, letterSpacing: -1 }}>
                          {s.value}
                        </p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', margin: 0, fontWeight: 500 }}>{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dokumentasi video */}
            {result.url_dokumentasi && (() => {
              const driveFileId = result.url_dokumentasi.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
              // Gunakan /preview agar Google Drive embed tanpa Chrome UI — lebih bersih & fullscreen supported
              const embedUrl = driveFileId
                ? `https://drive.google.com/file/d/${driveFileId}/preview`
                : result.url_dokumentasi
              return (
                <div style={{ ...G.card }} className="p-3 sm:p-6">
                  {/* Header: judul kecil kiri + tombol Download pojok kanan */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      <Video size={11} color="#34d399" /> Dokumentasi
                    </span>
                    {driveFileId && (
                      <a
                        href={`https://drive.google.com/file/d/${driveFileId}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                          borderRadius: 7, color: '#34d399', fontSize: 11, fontWeight: 700, textDecoration: 'none',
                        }}
                      >
                        <Download size={11} /> Download
                      </a>
                    )}
                  </div>
                  {/* Video: mobile = 3/2 (cukup untuk controls), desktop = 16/9 */}
                  <div
                    className="h-[360px] sm:h-auto sm:aspect-video"
                    style={{ borderRadius: 10, overflow: 'hidden', background: '#000' }}
                  >
                    <iframe
                      src={embedUrl}
                      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      title="Dokumentasi Penyembelihan"
                    />
                  </div>
                </div>
              )
            })()}

            {/* Stepper + Jamaah — auto-fit: stack on mobile, side-by-side on desktop */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>

              {/* Stepper */}
              <div style={{ ...G.card, padding: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Status Penyembelihan
                </h3>
                {steps.map((step, idx) => {
                  const isLast = idx === steps.length - 1
                  const palette = step.state === 'done' ? DONE_PALETTE : step.state === 'active' ? step.palette : UPCOMING_PALETTE
                  const isDoneOrActive = step.state === 'done' || step.state === 'active'

                  return (
                    <div key={step.key} style={{ display: 'flex', gap: 16 }}>
                      {/* Dot + Line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, flexShrink: 0,
                          background: isDoneOrActive ? palette.bg : 'rgba(255,255,255,0.05)',
                          border: `2px solid ${isDoneOrActive ? palette.dot : 'rgba(255,255,255,0.12)'}`,
                          color: isDoneOrActive ? palette.color : 'rgba(255,255,255,0.2)',
                          boxShadow: step.state === 'active' ? `0 0 12px ${palette.dot}55` : 'none',
                        }}>
                          {step.state === 'done' ? <Check size={14} /> : step.icon ?? (idx + 1)}
                        </div>
                        {!isLast && (
                          <div style={{
                            width: 2, flex: 1, margin: '4px 0', minHeight: 20,
                            background: step.state === 'done' ? DONE_PALETTE.dot : 'rgba(255,255,255,0.07)',
                          }} />
                        )}
                      </div>

                      {/* Label */}
                      <div style={{ paddingBottom: isLast ? 0 : 20 }}>
                        <p style={{
                          fontSize: 14, fontWeight: step.state === 'active' ? 700 : 500, lineHeight: '32px', margin: 0,
                          color: isDoneOrActive ? palette.color : 'rgba(255,255,255,0.22)',
                        }}>
                          {step.label}
                        </p>
                        {step.state === 'active' && (
                          <p style={{ fontSize: 11.5, color: palette.color, fontWeight: 600, margin: '2px 0 0', opacity: 0.85 }}>
                            {step.subLabel ?? 'Sedang berlangsung'}
                          </p>
                        )}
                        {step.state === 'done' && (
                          <p style={{ fontSize: 11.5, color: step.subLabel ? DONE_PALETTE.color : 'rgba(255,255,255,0.3)', fontWeight: step.subLabel ? 600 : 400, margin: '2px 0 0', opacity: step.subLabel ? 0.85 : 1 }}>
                            {step.subLabel ?? 'Selesai'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Jamaah */}
              <div style={{ ...G.card, padding: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Daftar Pengqurban ({result.jamaah.length} orang)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.jamaah.map((j, idx) => {
                    const da = STATUS_ANTAR_CONFIG[j.status_antar]
                    return (
                      <div key={j.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10,
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'rgba(16,185,129,0.15)', color: '#34d399',
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>{j.nama_lengkap}</p>
                          {j.atas_nama && <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', margin: '3px 0 0' }}>({j.atas_nama})</p>}
                          {j.status_antar === 'SEDANG_DIANTAR' && j.diantar_oleh && (
                            <p style={{ fontSize: 11, color: STATUS_ANTAR_CONFIG.SEDANG_DIANTAR.color, fontWeight: 600, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Truck size={10} /> Diantar oleh: {j.diantar_oleh}
                            </p>
                          )}
                        </div>
                        {result.status === 'SELESAI' && (
                          <span style={{
                            flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                            background: da.bg, color: da.color, border: `1px solid ${da.border}`,
                          }}>
                            {j.status_antar === 'SUDAH_DIANTAR' ? 'Diterima' : da.label}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.24)' }}>
              Halaman ini otomatis diperbarui setiap 30 detik
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
