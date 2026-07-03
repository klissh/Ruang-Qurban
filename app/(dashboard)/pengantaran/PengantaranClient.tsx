'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { STATUS_ANTAR_CONFIG } from '@/types'
import type { StatusAntar, JenisHewan } from '@/types'
import {
  Beef, PawPrint, Search, X, Truck, Clock, CheckCircle2,
  ChevronDown, ChevronUp, User, MapPin, Check,
} from 'lucide-react'

interface HewanRef {
  id: string
  kode_resi: string
  jenis_hewan: JenisHewan
  status: string
}

interface JamaahItem {
  id: string
  nama_lengkap: string
  atas_nama: string | null
  no_hp: string | null
  alamat_lengkap: string | null
  kode_jamaah: string | null
  status_antar: StatusAntar
  waktu_antar: string | null
  diantar_oleh: string | null
  id_hewan: string | null
  hewan: HewanRef | HewanRef[] | null
}

function getHewan(j: JamaahItem): HewanRef | null {
  if (!j.hewan) return null
  return Array.isArray(j.hewan) ? (j.hewan[0] ?? null) : j.hewan
}

const G = {
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 14,
  } as React.CSSProperties,
}

export default function PengantaranClient({ jamaahList }: { jamaahList: JamaahItem[] }) {
  const [list, setList] = useState<JamaahItem[]>(jamaahList)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'SEMUA' | StatusAntar>('SEMUA')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<{ ids: string[]; statusAntar: StatusAntar; diantarOleh: string } | null>(null)

  const counts = {
    SEMUA: list.length,
    BELUM_DIANTAR: list.filter((j) => j.status_antar === 'BELUM_DIANTAR').length,
    SEDANG_DIANTAR: list.filter((j) => j.status_antar === 'SEDANG_DIANTAR').length,
    SUDAH_DIANTAR: list.filter((j) => j.status_antar === 'SUDAH_DIANTAR').length,
  }

  const filtered = list.filter((j) => {
    if (filter !== 'SEMUA' && j.status_antar !== filter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    const h = getHewan(j)
    return (
      j.nama_lengkap.toLowerCase().includes(q) ||
      (j.kode_jamaah ?? '').toLowerCase().includes(q) ||
      (h?.kode_resi ?? '').toLowerCase().includes(q)
    )
  })

  // Grouping per hewan (kode_resi) supaya bisa "pilih semua satu kelompok"
  const groups = useMemo(() => {
    const map = new Map<string, { hewan: HewanRef | null; items: JamaahItem[] }>()
    for (const j of filtered) {
      const h = getHewan(j)
      const key = h?.id ?? j.id_hewan ?? 'lainnya'
      if (!map.has(key)) map.set(key, { hewan: h, items: [] })
      map.get(key)!.items.push(j)
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.hewan?.kode_resi ?? '').localeCompare(b.hewan?.kode_resi ?? '')
    )
  }, [filtered])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroupSelect(items: JamaahItem[]) {
    const ids = items.map((i) => i.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => {
        if (allSelected) next.delete(id)
        else next.add(id)
      })
      return next
    })
  }

  async function applyStatus(ids: string[], statusAntar: StatusAntar, diantarOleh: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/pengantaran', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status_antar: statusAntar, diantar_oleh: diantarOleh || undefined }),
      })
      if (!res.ok) throw new Error()
      const now = new Date().toISOString()
      setList((prev) =>
        prev.map((j) =>
          ids.includes(j.id)
            ? {
                ...j,
                status_antar: statusAntar,
                waktu_antar: statusAntar === 'BELUM_DIANTAR' ? null : now,
                diantar_oleh: diantarOleh ? diantarOleh : j.diantar_oleh,
              }
            : j
        )
      )
      toast.success(`${ids.length} data diperbarui → ${STATUS_ANTAR_CONFIG[statusAntar].label}`)
      setSelected(new Set())
      setModal(null)
    } catch {
      toast.error('Gagal memperbarui status pengantaran')
    } finally {
      setLoading(false)
    }
  }

  const filterPills: { key: 'SEMUA' | StatusAntar; label: string; icon: React.ReactNode }[] = [
    { key: 'SEMUA', label: 'Semua', icon: <Truck size={11} /> },
    { key: 'BELUM_DIANTAR', label: 'Belum Diantar', icon: <Clock size={11} /> },
    { key: 'SEDANG_DIANTAR', label: 'Sedang Diantar', icon: <Truck size={11} /> },
    { key: 'SUDAH_DIANTAR', label: 'Sudah Diantar', icon: <CheckCircle2 size={11} /> },
  ]

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(4,10,7,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '18px 20px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 22, color: 'rgba(255,255,255,0.97)', margin: 0, letterSpacing: '-0.3px' }}>
              Pengantaran
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', margin: '4px 0 0' }}>
              Monitoring pengantaran per-jamaah &middot; hanya hewan berstatus Selesai yang muncul
            </p>
          </div>

          {/* Counter real-time */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <CounterBadge label="Total" value={counts.SEMUA} color="rgba(255,255,255,0.85)" bg="rgba(255,255,255,0.05)" border="rgba(255,255,255,0.08)" />
            <CounterBadge label="Belum" value={counts.BELUM_DIANTAR} color={STATUS_ANTAR_CONFIG.BELUM_DIANTAR.color} bg="rgba(100,116,139,0.1)" border="rgba(148,163,184,0.2)" icon={<Clock size={11} color={STATUS_ANTAR_CONFIG.BELUM_DIANTAR.color} />} />
            <CounterBadge label="Diantar" value={counts.SEDANG_DIANTAR} color={STATUS_ANTAR_CONFIG.SEDANG_DIANTAR.color} bg="rgba(245,158,11,0.08)" border="rgba(251,191,36,0.18)" icon={<Truck size={11} color={STATUS_ANTAR_CONFIG.SEDANG_DIANTAR.color} />} />
            <CounterBadge label="Sudah" value={counts.SUDAH_DIANTAR} color={STATUS_ANTAR_CONFIG.SUDAH_DIANTAR.color} bg="rgba(16,185,129,0.08)" border="rgba(52,211,153,0.18)" icon={<CheckCircle2 size={11} color={STATUS_ANTAR_CONFIG.SUDAH_DIANTAR.color} />} />
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode jamaah, atau nomor hewan..."
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.88)',
              borderRadius: 10, padding: '9px 14px 9px 34px', fontSize: 13, outline: 'none',
              boxSizing: 'border-box',
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
          {filterPills.map(({ key, label, icon }) => {
            const active = filter === key
            const cfg = key !== 'SEMUA' ? STATUS_ANTAR_CONFIG[key] : null
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? (cfg?.bg ?? 'rgba(16,185,129,0.15)') : 'transparent',
                  color: active ? (cfg?.color ?? '#34d399') : 'rgba(255,255,255,0.4)',
                  border: active ? `1px solid ${cfg?.border ?? 'rgba(16,185,129,0.3)'}` : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {icon}{label}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 5,
                  background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
                  color: active ? (cfg?.color ?? '#34d399') : 'rgba(255,255,255,0.3)',
                }}>{counts[key]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── List per kelompok hewan ── */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map(({ hewan, items }) => {
          const groupKey = hewan?.id ?? 'lainnya'
          const isCollapsed = collapsed.has(groupKey)
          const allSelected = items.every((i) => selected.has(i.id))
          const someSelected = items.some((i) => selected.has(i.id))

          return (
            <div key={groupKey} style={G.card}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onClick={() => toggleGroupSelect(items)} />
                {hewan?.jenis_hewan === 'SAPI' ? <Beef size={13} color="rgba(255,255,255,0.4)" /> : <PawPrint size={13} color="rgba(255,255,255,0.4)" />}
                <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                  {hewan?.kode_resi ?? 'Tanpa Kelompok'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>({items.length} orang)</span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setCollapsed((prev) => {
                    const n = new Set(prev)
                    if (n.has(groupKey)) n.delete(groupKey)
                    else n.add(groupKey)
                    return n
                  })}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}
                >
                  {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                </button>
              </div>

              {/* Rows */}
              {!isCollapsed && items.map((j) => {
                const cfg = STATUS_ANTAR_CONFIG[j.status_antar]
                const isSelected = selected.has(j.id)
                return (
                  <div
                    key={j.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px', borderLeft: `3px solid ${cfg.dot}`,
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isSelected ? 'rgba(16,185,129,0.05)' : 'transparent',
                    }}
                  >
                    <Checkbox checked={isSelected} onClick={() => toggleSelect(j.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{j.nama_lengkap}</span>
                        <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10.5, color: 'rgba(255,255,255,0.32)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 5 }}>
                          {j.kode_jamaah ?? '-'}
                        </span>
                      </div>
                      {j.alamat_lengkap && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <MapPin size={10} color="rgba(255,255,255,0.25)" />
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>{j.alamat_lengkap}</span>
                        </div>
                      )}
                      {j.diantar_oleh && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <User size={10} color="rgba(255,255,255,0.25)" />
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>Diantar oleh: {j.diantar_oleh}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setModal({ ids: [j.id], statusAntar: j.status_antar, diantarOleh: j.diantar_oleh ?? '' })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                        padding: '5px 11px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                        cursor: 'pointer', background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}

        {groups.length === 0 && (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <Truck size={32} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {list.length === 0 ? 'Belum ada hewan berstatus Selesai untuk diantar' : 'Tidak ada data dengan filter ini'}
            </p>
          </div>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 16,
          background: 'rgba(7,18,11,0.97)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)', paddingLeft: 6 }}>
            {selected.size} dipilih
          </span>
          <button
            onClick={() => setModal({ ids: Array.from(selected), statusAntar: 'SUDAH_DIANTAR', diantarOleh: '' })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 11, color: 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
          >
            <Check size={13} /> Tandai Diantar
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Batal
          </button>
        </div>
      )}

      {/* ── Modal ubah status ── */}
      {modal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{
            background: 'rgba(7,18,11,0.97)', backdropFilter: 'blur(36px)', WebkitBackdropFilter: 'blur(36px)',
            border: '1px solid rgba(255,255,255,0.11)', borderTop: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 32px 80px rgba(0,0,0,0.52)',
          }}>
            <div style={{ padding: '22px 24px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
                {modal.ids.length > 1 ? `Update ${modal.ids.length} Jamaah` : 'Update Status Pengantaran'}
              </p>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.38)' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '18px 24px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.6px', marginBottom: 10 }}>STATUS ANTAR</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['BELUM_DIANTAR', 'SEDANG_DIANTAR', 'SUDAH_DIANTAR'] as StatusAntar[]).map((s) => {
                  const cfg = STATUS_ANTAR_CONFIG[s]
                  const isSelected = modal.statusAntar === s
                  return (
                    <button
                      key={s}
                      onClick={() => setModal((m) => m ? { ...m, statusAntar: s } : m)}
                      style={{
                        padding: '12px 14px', borderRadius: 11, textAlign: 'left', cursor: 'pointer',
                        background: isSelected ? cfg.bg : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isSelected ? cfg.border : 'rgba(255,255,255,0.07)'}`,
                        borderLeft: `3px solid ${isSelected ? cfg.dot : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? cfg.color : 'rgba(255,255,255,0.5)' }}>{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: '0 24px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.6px', marginBottom: 8 }}>
                DIANTAR OLEH <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: 'rgba(255,255,255,0.22)' }}>— opsional</span>
              </p>
              <input
                value={modal.diantarOleh}
                onChange={(e) => setModal((m) => m ? { ...m, diantarOleh: e.target.value } : m)}
                placeholder="Nama petugas / kurir"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.88)',
                  borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ padding: '4px 24px 22px', display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, color: 'rgba(255,255,255,0.5)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
              <button
                onClick={() => modal && applyStatus(modal.ids, modal.statusAntar, modal.diantarOleh)}
                disabled={loading}
                style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 11, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function CounterBadge({ label, value, color, bg, border, icon }: { label: string; value: number; color: string; bg: string; border: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: bg, border: `1px solid ${border}`, borderRadius: 10 }}>
      {icon}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
    </div>
  )
}

function Checkbox({ checked, indeterminate, onClick }: { checked: boolean; indeterminate?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked || indeterminate ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.06)',
        border: checked || indeterminate ? 'none' : '1px solid rgba(255,255,255,0.18)',
      }}
    >
      {checked && <Check size={12} color="white" strokeWidth={3} />}
      {indeterminate && !checked && <div style={{ width: 8, height: 2, background: 'white', borderRadius: 1 }} />}
    </button>
  )
}
