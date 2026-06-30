'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { STATUS_CONFIG, STATUS_ORDER } from '@/types'
import type { StatusHewan, JenisHewan } from '@/types'
import { isValidGDriveUrl, convertGDriveToPreview } from '@/lib/utils'
import { Beef, PawPrint, Check, Video, X, Activity } from 'lucide-react'

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

const STATUS_GLASS: Record<StatusHewan, { color: string; bg: string; border: string; dot: string }> = {
  BELUM_DISEMBELIH:  { color: '#94a3b8', bg: 'rgba(100,116,139,0.14)', border: 'rgba(148,163,184,0.22)', dot: '#64748b' },
  SEDANG_DISEMBELIH: { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)',  border: 'rgba(251,191,36,0.22)',  dot: '#f59e0b' },
  PENCACAHAN:        { color: '#60a5fa', bg: 'rgba(59,130,246,0.14)',   border: 'rgba(96,165,250,0.22)',  dot: '#3b82f6' },
  SELESAI:           { color: '#34d399', bg: 'rgba(16,185,129,0.14)',   border: 'rgba(52,211,153,0.22)',  dot: '#10b981' },
}

export default function StatusClient({ hewanList }: { hewanList: HewanItem[] }) {
  const [list, setList] = useState<HewanItem[]>(hewanList)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'SEMUA' | JenisHewan | StatusHewan>('SEMUA')

  const stats = {
    total: list.length,
    proses: list.filter((h) => h.status === 'SEDANG_DISEMBELIH' || h.status === 'PENCACAHAN').length,
    selesai: list.filter((h) => h.status === 'SELESAI').length,
  }

  const filtered = list.filter((h) => {
    if (filter === 'SEMUA') return true
    if (filter === 'SAPI' || filter === 'KAMBING') return h.jenis_hewan === filter
    return h.status === filter
  })

  async function handleSimpan() {
    if (!modal) return
    if (modal.urlDok && !isValidGDriveUrl(modal.urlDok)) {
      toast.error('Link Google Drive tidak valid')
      return
    }
    const previewUrl = modal.urlDok ? convertGDriveToPreview(modal.urlDok) : undefined
    setLoading(true)
    try {
      const res = await fetch('/api/hewan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_hewan: modal.hewan.id, status_baru: modal.statusBaru, url_dokumentasi: previewUrl }),
      })
      if (!res.ok) throw new Error()
      setList((prev) =>
        prev.map((h) =>
          h.id === modal.hewan.id
            ? { ...h, status: modal.statusBaru, url_dokumentasi: previewUrl ?? h.url_dokumentasi }
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

  const FILTERS = [
    { key: 'SEMUA', label: 'Semua', icon: null },
    { key: 'SAPI', label: 'Sapi', icon: <Beef size={12} /> },
    { key: 'KAMBING', label: 'Kambing', icon: <PawPrint size={12} /> },
    { key: 'BELUM_DISEMBELIH', label: 'Persiapan', icon: null },
    { key: 'SEDANG_DISEMBELIH', label: 'Disembelih', icon: null },
    { key: 'PENCACAHAN', label: 'Pencacahan', icon: null },
    { key: 'SELESAI', label: 'Selesai', icon: null },
  ]

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(4,10,7,0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ padding: '16px 16px 0' }}>
          <h1 style={{ fontWeight: 800, fontSize: 20, color: 'rgba(255,255,255,0.97)', margin: 0, letterSpacing: '-0.3px' }}>
            Status Hewan
          </h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>
              Total <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{stats.total}</strong>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>
              Proses <strong style={{ color: '#fbbf24' }}>{stats.proses}</strong>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>
              Selesai <strong style={{ color: '#34d399' }}>{stats.selesai}</strong>
            </span>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}>
          {FILTERS.map(({ key, label, icon }) => {
            const active = filter === key
            const sg = key !== 'SEMUA' && key !== 'SAPI' && key !== 'KAMBING'
              ? STATUS_GLASS[key as StatusHewan]
              : null
            return (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none',
                  background: active
                    ? (sg ? sg.bg : 'rgba(16,185,129,0.18)')
                    : 'rgba(255,255,255,0.06)',
                  color: active
                    ? (sg ? sg.color : '#34d399')
                    : 'rgba(255,255,255,0.46)',
                  boxShadow: active ? `0 0 0 1px ${sg ? sg.border : 'rgba(16,185,129,0.35)'}` : 'none',
                }}
              >
                {icon}{label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12 }}>
        {filtered.map((hewan) => {
          const sg = STATUS_GLASS[hewan.status]
          const isSelesai = hewan.status === 'SELESAI'
          const cfg = STATUS_CONFIG[hewan.status]
          const isSapi = hewan.jenis_hewan === 'SAPI'

          return (
            <button
              key={hewan.id}
              onClick={() => setModal({ hewan, statusBaru: hewan.status, urlDok: hewan.url_dokumentasi ?? '' })}
              style={{
                background: isSelesai ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${isSelesai ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.09)'}`,
                borderTop: `2px solid ${sg.dot}44`,
                borderRadius: 16, padding: 16,
                textAlign: 'left', cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.15s',
              }}
            >
              <p style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,0.95)', margin: '0 0 6px', letterSpacing: 0.3 }}>
                {hewan.kode_resi}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                {isSapi ? <Beef size={12} color="rgba(255,255,255,0.32)" /> : <PawPrint size={12} color="rgba(255,255,255,0.32)" />}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.34)' }}>{hewan.jenis_hewan}</span>
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20,
                background: sg.bg, color: sg.color, border: `1px solid ${sg.border}`,
                fontSize: 11, fontWeight: 700,
              }}>
                {isSelesai && <Check size={10} />}
                {cfg.labelShort}
              </div>
              {hewan.url_dokumentasi && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <Video size={10} color="#34d399" />
                  <span style={{ fontSize: 10.5, color: '#34d399' }}>Dokumentasi</span>
                </div>
              )}
            </button>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '64px 0', textAlign: 'center' }}>
            <Activity size={32} color="rgba(255,255,255,0.14)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Tidak ada hewan dengan filter ini</p>
          </div>
        )}
      </div>

      {/* Modal Update Status */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{
            background: 'rgba(7,18,11,0.97)',
            backdropFilter: 'blur(36px)',
            WebkitBackdropFilter: 'blur(36px)',
            border: '1px solid rgba(255,255,255,0.11)',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 24,
            width: '100%', maxWidth: 520,
            boxShadow: '0 32px 80px rgba(0,0,0,0.52)',
          }}>
            {/* Header */}
            <div style={{ padding: '22px 26px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 800, fontSize: 20, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
                  {modal.hewan.kode_resi}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  {modal.hewan.jenis_hewan === 'SAPI'
                    ? <Beef size={13} color="rgba(255,255,255,0.4)" />
                    : <PawPrint size={13} color="rgba(255,255,255,0.4)" />
                  }
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{modal.hewan.jenis_hewan}</span>
                </div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}>
                <X size={15} />
              </button>
            </div>

            {/* Status grid */}
            <div style={{ padding: '0 26px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                Ubah Status
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {STATUS_ORDER.map((status) => {
                  const sg = STATUS_GLASS[status]
                  const cfg = STATUS_CONFIG[status]
                  const isSelected = modal.statusBaru === status
                  const isCurrent = modal.hewan.status === status
                  return (
                    <button
                      key={status}
                      onClick={() => setModal((m) => m ? { ...m, statusBaru: status } : m)}
                      style={{
                        padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                        cursor: 'pointer',
                        background: isSelected ? sg.bg : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isSelected ? sg.border : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: isSelected ? `0 0 0 1px ${sg.border}` : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: isSelected ? sg.color : 'rgba(255,255,255,0.5)' }}>
                        {cfg.labelShort}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>Status sekarang</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dokumentasi */}
            <div style={{ padding: '0 26px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                Link Dokumentasi <span style={{ fontWeight: 400, textTransform: 'none' }}>(opsional)</span>
              </p>
              <input
                type="url"
                value={modal.urlDok}
                onChange={(e) => setModal((m) => m ? { ...m, urlDok: e.target.value } : m)}
                placeholder="https://drive.google.com/file/d/..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.9)',
                  borderRadius: 10, padding: '10px 14px', fontSize: 13.5, outline: 'none',
                }}
              />
              {modal.urlDok && !isValidGDriveUrl(modal.urlDok) && (
                <p style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Format link tidak valid</p>
              )}
            </div>

            {/* Buttons */}
            <div style={{ padding: '0 26px 26px', display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={handleSimpan} disabled={loading} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.38)', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
