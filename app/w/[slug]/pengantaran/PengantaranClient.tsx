'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { STATUS_ANTAR_CONFIG } from '@/types'
import type { StatusAntar, JenisHewan, Kurir } from '@/types'
import {
  Beef, PawPrint, Search, X, Truck, Clock, CheckCircle2,
  ChevronDown, ChevronUp, User, MapPin, Check, AlertTriangle,
  UserCheck, Info,
} from 'lucide-react'
import { CustomSelect } from '@/components/ui/CustomSelect'

interface HewanRef { id: string; kode_resi: string; jenis_hewan: JenisHewan; status: string }
interface JamaahItem {
  id: string; nama_lengkap: string; atas_nama: string | null
  no_hp: string | null; alamat_lengkap: string | null
  kode_jamaah: string | null; status_antar: StatusAntar
  waktu_antar: string | null; diantar_oleh: string | null
  id_hewan: string | null; hewan: HewanRef | HewanRef[] | null
}
function getHewan(j: JamaahItem): HewanRef | null {
  if (!j.hewan) return null
  return Array.isArray(j.hewan) ? (j.hewan[0] ?? null) : j.hewan
}

const G = {
  card: {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
  } as React.CSSProperties,
  input: {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.9)',
    borderRadius: 10, padding: '10px 14px', fontSize: 13.5, outline: 'none',
  } as React.CSSProperties,
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

const STATUS_ORDER: StatusAntar[] = ['BELUM_DIANTAR', 'SEDANG_DIANTAR', 'GAGAL_DIANTAR', 'SUDAH_DIANTAR']

interface Props {
  jamaahList: JamaahItem[]
  kurirList: Kurir[]
  isSuperAdmin: boolean
}

export default function PengantaranClient({ jamaahList, kurirList: initialKurirList, isSuperAdmin }: Props) {
  const params = useParams()
  const slug   = typeof params?.slug === 'string' ? params.slug : ''
  const [list, setList]           = useState<JamaahItem[]>(jamaahList)
  const [kurirList, setKurirList] = useState<Kurir[]>(initialKurirList)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'SEMUA' | StatusAntar>('SEMUA')
  const [page, setPage]           = useState(1)
  const [perPage, setPerPage]     = useState(10)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  // Mulai semua COLLAPSED (set kosong = tidak ada yang expanded)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading]     = useState(false)

  // Modal update status
  const [modal, setModal] = useState<{
    ids: string[]
    statusAntar: StatusAntar
    kurirId: string
    kurirCustom: string
    showCustom: boolean
  } | null>(null)

  const counts = {
    SEMUA:          list.length,
    BELUM_DIANTAR:  list.filter((j) => j.status_antar === 'BELUM_DIANTAR').length,
    SEDANG_DIANTAR: list.filter((j) => j.status_antar === 'SEDANG_DIANTAR').length,
    SUDAH_DIANTAR:  list.filter((j) => j.status_antar === 'SUDAH_DIANTAR').length,
    GAGAL_DIANTAR:  list.filter((j) => j.status_antar === 'GAGAL_DIANTAR').length,
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

  const groups = useMemo(() => {
    const map = new Map<string, { hewan: HewanRef | null; items: JamaahItem[] }>()
    for (const j of filtered) {
      const h = getHewan(j)
      const key = h?.id ?? j.id_hewan ?? 'lainnya'
      if (!map.has(key)) map.set(key, { hewan: h, items: [] })
      map.get(key)!.items.push(j)
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.hewan?.kode_resi ?? '').localeCompare(b.hewan?.kode_resi ?? ''))
  }, [filtered])

  useEffect(() => { setPage(1) }, [search, filter])
  const totalPages      = perPage === 0 ? 1 : Math.ceil(groups.length / perPage)
  const paginatedGroups = perPage === 0 ? groups : groups.slice((page - 1) * perPage, page * perPage)

  function toggleSelect(id: string) {
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleExpand(key: string) {
    setExpanded((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function toggleGroupSelect(items: JamaahItem[]) {
    const ids = items.map((i) => i.id)
    const allSel = ids.every((id) => selected.has(id))
    setSelected((p) => {
      const n = new Set(p)
      ids.forEach((id) => { if (allSel) n.delete(id); else n.add(id) })
      return n
    })
  }

  function openModal(ids: string[], currentStatus: StatusAntar) {
    setModal({ ids, statusAntar: currentStatus, kurirId: '', kurirCustom: '', showCustom: false })
  }

  function resolveDiantarOleh(m: NonNullable<typeof modal>): string {
    if (m.showCustom) return m.kurirCustom.trim()
    if (m.kurirId) return kurirList.find((k) => k.id === m.kurirId)?.nama ?? ''
    return ''
  }

  async function applyStatus() {
    if (!modal) return
    const diantarOleh = resolveDiantarOleh(modal)
    setLoading(true)
    try {
      const res = await fetch('/api/pengantaran', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: modal.ids, status_antar: modal.statusAntar, diantar_oleh: diantarOleh || null }),
      })
      if (!res.ok) throw new Error()
      const now = new Date().toISOString()
      setList((prev) => prev.map((j) =>
        modal.ids.includes(j.id)
          ? { ...j, status_antar: modal.statusAntar, waktu_antar: modal.statusAntar === 'BELUM_DIANTAR' ? null : now, diantar_oleh: diantarOleh || null }
          : j
      ))
      setSelected(new Set())
      setModal(null)
      toast.success(`${modal.ids.length} jamaah → ${STATUS_ANTAR_CONFIG[modal.statusAntar].label}`)
    } catch { toast.error('Gagal memperbarui status') }
    finally { setLoading(false) }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(10px)', zIndex: 9999,
    display: 'flex', overflowY: 'auto', padding: '24px 16px',
  }

  const filterTabs = [
    { key: 'SEMUA' as const,          label: 'Semua',         count: counts.SEMUA },
    { key: 'BELUM_DIANTAR' as const,  label: 'Belum Diantar', count: counts.BELUM_DIANTAR },
    { key: 'SEDANG_DIANTAR' as const, label: 'Sedang Diantar',count: counts.SEDANG_DIANTAR },
    { key: 'SUDAH_DIANTAR' as const,  label: 'Sudah Diantar', count: counts.SUDAH_DIANTAR },
    { key: 'GAGAL_DIANTAR' as const,  label: 'Gagal Diantar', count: counts.GAGAL_DIANTAR },
  ]

  const statusColor: Record<string, string> = {
    SEMUA: 'rgba(255,255,255,0.5)',
    BELUM_DIANTAR: '#94a3b8',
    SEDANG_DIANTAR: '#fbbf24',
    SUDAH_DIANTAR: '#34d399',
    GAGAL_DIANTAR: '#f87171',
  }

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-5xl mx-auto animate-slide-up">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>
            Pengantaran
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6, margin: '6px 0 0' }}>
            Monitoring pengantaran per-jamaah · hanya hewan berstatus Selesai yang muncul
          </p>
        </div>

        {/* Stats chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', val: counts.SEMUA, color: 'rgba(255,255,255,0.55)' },
            { label: 'Belum', val: counts.BELUM_DIANTAR, color: '#94a3b8' },
            { label: 'Diantar', val: counts.SEDANG_DIANTAR, color: '#fbbf24' },
            { label: 'Sudah', val: counts.SUDAH_DIANTAR, color: '#34d399' },
            ...(counts.GAGAL_DIANTAR > 0 ? [{ label: 'Gagal', val: counts.GAGAL_DIANTAR, color: '#f87171' }] : []),
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color }}>{val}</span>
            </div>
          ))}

        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: '#34d399', fontWeight: 600 }}>{selected.size} dipilih</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_ORDER.map((s) => {
              const cfg = STATUS_ANTAR_CONFIG[s]
              return (
                <button key={s} onClick={() => openModal([...selected], s)}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color }}>
                  → {cfg.label}
                </button>
              )
            })}
          </div>
          <button onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            Batal pilih
          </button>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {filterTabs.map((t) => {
          const active = filter === t.key
          const col = statusColor[t.key]
          return (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                border: active ? `1px solid ${col}` : '1px solid rgba(255,255,255,0.08)',
                background: active ? `${col}20` : 'rgba(255,255,255,0.04)',
                color: active ? col : 'rgba(255,255,255,0.4)' }}>
              {t.label} <span style={{ opacity: 0.6 }}>({t.count})</span>
            </button>
          )
        })}
      </div>

      {/* Search + per-page */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode jamaah, atau nomor hewan..."
            style={{ ...G.input, paddingLeft: 36 }} />
        </div>
      </div>


      {/* ── Info banner: arahkan ke Pengaturan untuk kelola kurir ── */}
      {isSuperAdmin && (
        <div style={{
          marginBottom: 14, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Info size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: 0, flex: 1, lineHeight: 1.6 }}>
            Untuk menambah atau mengubah daftar kurir, buka{' '}
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Pengaturan → Manajemen Kurir</strong>
          </p>
          <button
            onClick={() => window.location.href = `/w/${slug}/pengaturan`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8, flexShrink: 0,
              background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)',
              color: '#93c5fd', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Buka Pengaturan →
          </button>
        </div>
      )}

      {/* Groups */}
      {paginatedGroups.length === 0 && (
        <div style={{ ...G.card, padding: '48px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Tidak ada data</p>
        </div>
      )}

      {paginatedGroups.map((group) => {
        const h = group.hewan
        const groupKey = h?.id ?? 'lainnya'
        const isCollapsed = !expanded.has(groupKey)
        const allSel = group.items.every((i) => selected.has(i.id))
        const someSel = group.items.some((i) => selected.has(i.id))
        const isSapi = h?.jenis_hewan === 'SAPI'

        return (
          <div key={groupKey} style={{ ...G.card, marginBottom: 10 }}>
            {/* Group header */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => toggleExpand(groupKey)}>
              {/* Checkbox grup */}
              <div onClick={(e) => { e.stopPropagation(); toggleGroupSelect(group.items) }}
                style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${allSel ? '#10b981' : someSel ? '#10b981' : 'rgba(255,255,255,0.2)'}`, background: allSel ? '#10b981' : someSel ? 'rgba(16,185,129,0.3)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {(allSel || someSel) && <Check size={10} color="white" />}
              </div>
              {/* Icon hewan */}
              {isSapi
                ? <Beef size={15} style={{ color: '#fb923c', flexShrink: 0 }} />
                : <PawPrint size={15} style={{ color: '#a78bfa', flexShrink: 0 }} />}
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.88)', flex: 1 }}>
                {h?.kode_resi ?? 'Tidak dikelompokkan'}
              </span>
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>({group.items.length} orang)</span>
              {/* Dot status indicators — tampil saat collapsed */}
              {isCollapsed && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {group.items.map((j) => {
                    const col = STATUS_ANTAR_CONFIG[j.status_antar].dot
                    return <div key={j.id} style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                  })}
                </div>
              )}
              {isCollapsed
                ? <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                : <ChevronUp   size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />}
            </div>

            {/* Jamaah rows */}
            {!isCollapsed && group.items.map((j, idx) => {
              const cfg   = STATUS_ANTAR_CONFIG[j.status_antar]
              const isSel = selected.has(j.id)
              return (
                <div key={j.id}
                  onClick={() => openModal([j.id], j.status_antar)}
                  style={{ padding: '12px 16px', borderBottom: idx < group.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: isSel ? 'rgba(16,185,129,0.05)' : 'transparent', display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  {/* Checkbox */}
                  <div onClick={(e) => { e.stopPropagation(); toggleSelect(j.id) }}
                    style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSel ? '#10b981' : 'rgba(255,255,255,0.15)'}`, background: isSel ? '#10b981' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3 }}>
                    {isSel && <Check size={9} color="white" />}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{j.nama_lengkap}</span>
                      {j.atas_nama && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>a.n. {j.atas_nama}</span>}
                      {j.kode_jamaah && (
                        <span style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                          {j.kode_jamaah}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
                      {j.alamat_lengkap && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} /> {j.alamat_lengkap}
                        </span>
                      )}
                      {j.diantar_oleh && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={10} /> {j.diantar_oleh}
                        </span>
                      )}
                      {j.waktu_antar && j.status_antar !== 'BELUM_DIANTAR' && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} />
                          {new Date(j.waktu_antar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {j.status_antar === 'GAGAL_DIANTAR' && (
                      <div style={{ marginTop: 6, padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={11} style={{ color: '#f87171', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#fca5a5' }}>Pengurban tidak ada / tidak bisa menerima — dikembalikan ke masjid</span>
                      </div>
                    )}
                  </div>
                  {/* Tombol status — klik buka modal */}
                  <button onClick={(e) => { e.stopPropagation(); openModal([j.id], j.status_antar) }}
                    style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
                    {cfg.label}
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Pagination */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.3)' }}>
          Menampilkan {Math.min((page - 1) * (perPage || groups.length) + 1, groups.length)}–{Math.min(page * (perPage || groups.length), groups.length)} dari {groups.length} kelompok
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Tampilkan:</span>
          {[5, 10, 20, 0].map((n) => (
            <button key={n} onClick={() => { setPerPage(n); setPage(1) }}
              style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: perPage === n ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)', background: perPage === n ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', color: perPage === n ? '#34d399' : 'rgba(255,255,255,0.4)' }}>
              {n === 0 ? 'Semua' : n}
            </button>
          ))}
          {totalPages > 1 && (
            <>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', opacity: page === 1 ? 0.4 : 1 }}>←</button>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, cursor: page === totalPages ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', opacity: page === totalPages ? 0.4 : 1 }}>→</button>
            </>
          )}
        </div>
      </div>

      {/* ══ MODAL: Update Status Pengantaran ════════════════════════════════ */}
      {modal && (
        <ModalPortal>
          <div onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }} style={overlayStyle}>
            <div style={{ margin: 'auto', width: '100%', maxWidth: 420, background: 'rgba(7,18,11,0.97)', backdropFilter: 'blur(36px)', border: '1px solid rgba(255,255,255,0.11)', borderTop: '1px solid rgba(255,255,255,0.2)', borderRadius: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.52)' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Update Status Pengantaran</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>{modal.ids.length} jamaah akan diupdate</p>
                </div>
                <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Status pilihan — radio style */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Status Antar</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {STATUS_ORDER.map((s) => {
                      const cfg    = STATUS_ANTAR_CONFIG[s]
                      const active = modal.statusAntar === s
                      return (
                        <button key={s} onClick={() => setModal({ ...modal, statusAntar: s })}
                          style={{ padding: '11px 16px', borderRadius: 12, fontSize: 13.5, fontWeight: active ? 700 : 500, cursor: 'pointer', textAlign: 'left', border: active ? `1px solid ${cfg.border}` : '1px solid rgba(255,255,255,0.08)', background: active ? cfg.bg : 'rgba(255,255,255,0.03)', color: active ? cfg.color : 'rgba(255,255,255,0.55)', transition: 'all 0.15s' }}>
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Diantar oleh — dropdown kurir */}
                {modal.statusAntar !== 'BELUM_DIANTAR' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
                      Diantar Oleh <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none' }}>— opsional</span>
                    </label>
                    {!modal.showCustom ? (
                      <CustomSelect
                        value={modal.kurirId}
                        onChange={(v) => setModal({ ...modal, kurirId: v })}
                        options={[
                          { value: '', label: '— Tidak dipilih —' },
                          ...kurirList.map((k) => ({ value: k.id, label: k.nama + (k.no_hp ? ` (${k.no_hp})` : '') })),
                        ]}
                      />
                    ) : (
                      <input type="text" value={modal.kurirCustom}
                        onChange={(e) => setModal({ ...modal, kurirCustom: e.target.value })}
                        placeholder="Tulis nama pengantar..."
                        style={G.input} autoFocus />
                    )}
                    <button onClick={() => setModal({ ...modal, showCustom: !modal.showCustom, kurirId: '', kurirCustom: '' })}
                      style={{ marginTop: 7, fontSize: 11.5, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                      {modal.showCustom ? '← Pilih dari daftar kurir' : '+ Tulis nama sendiri'}
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.55)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Batal
                </button>
                <button onClick={applyStatus} disabled={loading}
                  style={{ flex: 2, padding: 11, borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', border: 'none', opacity: loading ? 0.6 : 1, background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                  {loading ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  )
}
