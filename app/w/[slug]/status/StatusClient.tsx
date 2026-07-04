'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { STATUS_CONFIG, STATUS_ORDER } from '@/types'
// STATUS_ORDER dipakai untuk counts & grid pilihan status
import type { StatusHewan, JenisHewan } from '@/types'
import { isValidGDriveUrl, convertGDriveToPreview } from '@/lib/utils'
import {
  Beef, PawPrint, Video, X, Activity,
  Clock, Flame, CheckCircle2, ChevronRight, Search,
  ClipboardList, Truck, CheckCheck, Scissors, PackageCheck,
} from 'lucide-react'

interface HewanItem {
  id: string
  kode_resi: string
  jenis_hewan: JenisHewan
  status: StatusHewan
  url_dokumentasi: string | null
}

interface ModalState {
  hewan: HewanItem
  statusBaru: StatusHewan
  urlDok: string
}

const SG: Record<StatusHewan, { color: string; bg: string; border: string; dot: string; label: string }> = {
  TERDAFTAR:         { color: '#94a3b8', bg: 'rgba(100,116,139,0.14)', border: 'rgba(148,163,184,0.22)', dot: '#64748b', label: 'Terdaftar' },
  SAMPAI_MASJID:     { color: '#38bdf8', bg: 'rgba(14,165,233,0.14)',  border: 'rgba(56,189,248,0.22)',  dot: '#0ea5e9', label: 'Sampai Masjid' },
  MENUNGGU_SEMBELIH: { color: '#94a3b8', bg: 'rgba(100,116,139,0.14)', border: 'rgba(148,163,184,0.22)', dot: '#64748b', label: 'Menunggu' },
  SEDANG_DISEMBELIH: { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)',  border: 'rgba(251,191,36,0.22)',  dot: '#f59e0b', label: 'Disembelih' },
  SUDAH_DISEMBELIH:  { color: '#fb923c', bg: 'rgba(249,115,22,0.14)',  border: 'rgba(251,146,60,0.22)',  dot: '#f97316', label: 'Sudah Disembelih' },
  PENCACAHAN:        { color: '#60a5fa', bg: 'rgba(59,130,246,0.14)',   border: 'rgba(96,165,250,0.22)',  dot: '#3b82f6', label: 'Pencacahan' },
  PACKING:           { color: '#818cf8', bg: 'rgba(99,102,241,0.14)',   border: 'rgba(129,140,248,0.22)', dot: '#6366f1', label: 'Packing' },
  SELESAI:           { color: '#34d399', bg: 'rgba(16,185,129,0.14)',   border: 'rgba(52,211,153,0.22)',  dot: '#10b981', label: 'Selesai' },
}

const STATUS_ICON: Record<StatusHewan, React.ReactNode> = {
  TERDAFTAR:         <ClipboardList size={12} />,
  SAMPAI_MASJID:     <Truck size={12} />,
  MENUNGGU_SEMBELIH: <Clock size={12} />,
  SEDANG_DISEMBELIH: <Flame size={12} />,
  SUDAH_DISEMBELIH:  <CheckCheck size={12} />,
  PENCACAHAN:        <Scissors size={12} />,
  PACKING:           <PackageCheck size={12} />,
  SELESAI:           <CheckCircle2 size={12} />,
}

export default function StatusClient({ hewanList }: { hewanList: HewanItem[] }) {
  const [list, setList] = useState<HewanItem[]>(hewanList)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'SEMUA' | 'SAPI-A' | 'SAPI-B' | JenisHewan | StatusHewan>('SEMUA')
  const [search, setSearch] = useState('')

  // ── Counts untuk filter badges ──
  const counts: Record<string, number> = {
    SEMUA:    list.length,
    'SAPI-A': list.filter((h) => h.kode_resi.startsWith('SAPI-A')).length,
    'SAPI-B': list.filter((h) => h.kode_resi.startsWith('SAPI-B')).length,
    KAMBING:  list.filter((h) => h.jenis_hewan === 'KAMBING').length,
    ...STATUS_ORDER.reduce((acc, s) => {
      acc[s] = list.filter((h) => h.status === s).length
      return acc
    }, {} as Record<string, number>),
  }

  const filtered = list.filter((h) => {
    // Filter tipe/status
    if (filter === 'SAPI-A'  && !h.kode_resi.startsWith('SAPI-A')) return false
    if (filter === 'SAPI-B'  && !h.kode_resi.startsWith('SAPI-B')) return false
    if (filter === 'KAMBING' && h.jenis_hewan !== 'KAMBING') return false
    if (filter !== 'SEMUA' && filter !== 'SAPI-A' && filter !== 'SAPI-B' && filter !== 'KAMBING') {
      if (h.status !== filter) return false
    }
    // Search
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return h.kode_resi.toLowerCase().includes(q)
  })

  async function handleSimpan() {
    if (!modal) return
    if (modal.urlDok && !isValidGDriveUrl(modal.urlDok)) {
      toast.error('Link Google Drive tidak valid'); return
    }

    // Tentukan apa yang dikirim untuk url_dokumentasi:
    // - Ada URL baru → kirim preview URL
    // - URL lama ada tapi dikosongkan → kirim null (hapus)
    // - Tidak ada perubahan → skip (undefined)
    let dokPayload: string | null | undefined
    if (modal.urlDok) {
      dokPayload = convertGDriveToPreview(modal.urlDok)
    } else if (modal.hewan.url_dokumentasi) {
      dokPayload = null  // hapus
    } else {
      dokPayload = undefined  // tidak berubah
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        id_hewan: modal.hewan.id,
        status_baru: modal.statusBaru,
      }
      if (dokPayload !== undefined) body.url_dokumentasi = dokPayload

      const res = await fetch('/api/hewan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setList((prev) =>
        prev.map((h) =>
          h.id === modal.hewan.id
            ? { ...h, status: modal.statusBaru, url_dokumentasi: dokPayload !== undefined ? dokPayload : h.url_dokumentasi }
            : h
        )
      )
      toast.success(`${modal.hewan.kode_resi} → ${STATUS_CONFIG[modal.statusBaru].label}`)
      setModal(null)
    } catch {
      toast.error('Gagal memperbarui status')
    } finally {
      setLoading(false)
    }
  }

  // ── Filter groups ──
  const jenisFilters = [
    { key: 'SEMUA',   label: 'Semua',   icon: null },
    { key: 'SAPI-A',  label: 'Sapi A',  icon: <Beef size={11} /> },
    { key: 'SAPI-B',  label: 'Sapi B',  icon: <Beef size={11} /> },
    { key: 'KAMBING', label: 'Kambing', icon: <PawPrint size={11} /> },
  ]
  const statusFilters = STATUS_ORDER.map((s) => ({
    key: s,
    label: SG[s].label,
    icon: STATUS_ICON[s],
    color: SG[s],
  }))

  function FilterBtn({ fkey, label, icon, activeColor, activeBg, activeBorder }:
    { fkey: string; label: string; icon: React.ReactNode; activeColor?: string; activeBg?: string; activeBorder?: string }) {
    const active = filter === fkey
    const count = (counts as Record<string, number>)[fkey] ?? 0
    return (
      <button
        onClick={() => setFilter(fkey as any)}
        style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.15s',
          background: active ? (activeBg ?? 'rgba(16,185,129,0.15)') : 'transparent',
          color: active ? (activeColor ?? '#34d399') : 'rgba(255,255,255,0.4)',
          border: active ? `1px solid ${activeBorder ?? 'rgba(16,185,129,0.3)'}` : '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {icon}
        {label}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 5,
          background: active ? (activeBg ?? 'rgba(16,185,129,0.2)') : 'rgba(255,255,255,0.07)',
          color: active ? (activeColor ?? '#34d399') : 'rgba(255,255,255,0.3)',
        }}>{count}</span>
      </button>
    )
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(4,10,7,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '18px 20px 0',
      }}>
        {/* Title + stats */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 22, color: 'rgba(255,255,255,0.97)', margin: 0, letterSpacing: '-0.3px' }}>
              Status Hewan
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', margin: '4px 0 0' }}>
              Klik kartu untuk memperbarui status
            </p>
          </div>

          {/* Stat badges */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>{counts.SEMUA}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 10 }}>
              <Flame size={11} color="#fbbf24" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Proses</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>
                {counts.SEMUA - counts.TERDAFTAR - counts.SELESAI}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 10 }}>
              <CheckCircle2 size={11} color="#34d399" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Selesai</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#34d399', lineHeight: 1 }}>{counts.SELESAI}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }}>
              <Video size={11} color="#818cf8" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Dok</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#818cf8', lineHeight: 1 }}>{list.filter(h => h.url_dokumentasi).length}</span>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode resi..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: 'rgba(255,255,255,0.88)',
              borderRadius: 10, padding: '9px 36px 9px 36px',
              fontSize: 13, outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', padding: 3 }}>
              <X size={11} />
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 5, paddingBottom: 14, overflowX: 'auto' }}>
          {/* Jenis group */}
          {jenisFilters.map(({ key, label, icon }) => (
            <FilterBtn key={key} fkey={key} label={label} icon={icon} />
          ))}

          {/* Separator */}
          <span style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '2px 4px', flexShrink: 0 }} />

          {/* Status group */}
          {statusFilters.map(({ key, label, icon, color }) => (
            <FilterBtn
              key={key} fkey={key} label={label} icon={icon}
              activeColor={color.color} activeBg={color.bg} activeBorder={color.border}
            />
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ padding: '20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 10 }}>
        {filtered.map((hewan) => {
          const sg = SG[hewan.status]
          const isSapi = hewan.jenis_hewan === 'SAPI'
          const isSelesai = hewan.status === 'SELESAI'

          return (
            <button
              key={hewan.id}
              onClick={() => setModal({ hewan, statusBaru: hewan.status, urlDok: hewan.url_dokumentasi ?? '' })}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: `3px solid ${sg.dot}`,
                borderRadius: 13,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s, transform 0.1s',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}
            >
              {/* Top row: kode + jenis icon */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{
                  fontFamily: 'ui-monospace,monospace', fontWeight: 800, fontSize: 14.5,
                  color: 'rgba(255,255,255,0.92)', letterSpacing: 0.3, lineHeight: 1.2,
                }}>
                  {hewan.kode_resi}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  {isSapi
                    ? <Beef size={13} color="rgba(255,255,255,0.3)" />
                    : <PawPrint size={13} color="rgba(255,255,255,0.3)" />}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
                    {isSapi ? 'Sapi' : 'Kambing'}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 8,
                background: sg.bg, color: sg.color, border: `1px solid ${sg.border}`,
                fontSize: 11.5, fontWeight: 700, alignSelf: 'flex-start',
              }}>
                {STATUS_ICON[hewan.status]}
                {sg.label}
              </div>

              {/* Footer row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                {hewan.url_dokumentasi ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Video size={10} color="#34d399" />
                    <span style={{ fontSize: 10.5, color: '#34d399', fontWeight: 500 }}>Dokumentasi</span>
                  </div>
                ) : (
                  <span />
                )}
                <ChevronRight size={13} color="rgba(255,255,255,0.18)" />
              </div>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '64px 0', textAlign: 'center' }}>
            <Activity size={32} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              Tidak ada hewan dengan filter ini
            </p>
          </div>
        )}
      </div>

      {/* ── Modal Update Status ── */}
      {modal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{
            background: 'rgba(7,18,11,0.97)',
            backdropFilter: 'blur(36px)',
            WebkitBackdropFilter: 'blur(36px)',
            border: '1px solid rgba(255,255,255,0.11)',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 24,
            width: '100%', maxWidth: 480,
            boxShadow: '0 32px 80px rgba(0,0,0,0.52)',
          }}>

            {/* Header */}
            <div style={{ padding: '22px 24px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Left color accent */}
                <div style={{ width: 4, borderRadius: 4, background: SG[modal.hewan.status].dot, flexShrink: 0, alignSelf: 'stretch' }} />
                <div>
                  <p style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 800, fontSize: 18, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
                    {modal.hewan.kode_resi}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    {modal.hewan.jenis_hewan === 'SAPI'
                      ? <Beef size={12} color="rgba(255,255,255,0.35)" />
                      : <PawPrint size={12} color="rgba(255,255,255,0.35)" />}
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>
                      {modal.hewan.jenis_hewan === 'SAPI' ? 'Sapi' : 'Kambing'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 2px' }}>·</span>
                    <span style={{ fontSize: 12, color: SG[modal.hewan.status].color, fontWeight: 600 }}>
                      {SG[modal.hewan.status].label}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>

            {/* Status grid */}
            <div style={{ padding: '18px 24px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.6px', marginBottom: 10 }}>
                UBAH STATUS
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {STATUS_ORDER.map((status) => {
                  const sg = SG[status]
                  const isSelected = modal.statusBaru === status
                  const isCurrent = modal.hewan.status === status
                  return (
                    <button
                      key={status}
                      onClick={() => setModal((m) => m ? { ...m, statusBaru: status } : m)}
                      style={{
                        padding: '12px 14px', borderRadius: 11, textAlign: 'left',
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: isSelected ? sg.bg : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isSelected ? sg.border : 'rgba(255,255,255,0.07)'}`,
                        borderLeft: `3px solid ${isSelected ? sg.dot : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isCurrent ? 3 : 0 }}>
                        <span style={{ color: isSelected ? sg.color : 'rgba(255,255,255,0.3)' }}>
                          {STATUS_ICON[status]}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: isSelected ? sg.color : 'rgba(255,255,255,0.5)' }}>
                          {sg.label}
                        </span>
                      </div>
                      {isCurrent && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>Status saat ini</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dokumentasi */}
            <div style={{ padding: '0 24px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.6px', margin: 0 }}>
                  DOKUMENTASI <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: 'rgba(255,255,255,0.22)' }}>— opsional</span>
                </p>
                {/* Tombol hapus — muncul jika ada dokumentasi sebelumnya */}
                {modal.hewan.url_dokumentasi && (
                  <button
                    onClick={() => setModal((m) => m ? { ...m, urlDok: '' } : m)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    <X size={10} /> Hapus Dokumentasi
                  </button>
                )}
              </div>
              <input
                type="url"
                value={modal.urlDok}
                onChange={(e) => setModal((m) => m ? { ...m, urlDok: e.target.value } : m)}
                placeholder="https://drive.google.com/file/d/..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.88)',
                  borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {/* Indicator: dokumentasi akan dihapus */}
              {modal.hewan.url_dokumentasi && !modal.urlDok && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '5px 10px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 7 }}>
                  <Video size={11} color="#f87171" />
                  <span style={{ fontSize: 11, color: '#f87171' }}>Dokumentasi akan dihapus saat disimpan</span>
                </div>
              )}
              {modal.urlDok && !isValidGDriveUrl(modal.urlDok) && (
                <p style={{ fontSize: 11, color: '#f87171', marginTop: 5 }}>Format link tidak valid</p>
              )}
            </div>

            {/* Buttons */}
            <div style={{ padding: '4px 24px 22px', display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, color: 'rgba(255,255,255,0.5)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={handleSimpan} disabled={loading} style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 11, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.35)', opacity: loading ? 0.6 : 1 }}
                    suppressHydrationWarning>
                {loading ? 'Menyimpan...' : 'Simpan Status'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
