'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { STATUS_ANTAR_CONFIG } from '@/types'
import type { StatusAntar, JenisHewan, Kurir } from '@/types'
import {
  Beef, PawPrint, Search, X, Truck, Clock, CheckCircle2,
  ChevronDown, ChevronUp, User, MapPin, Check, AlertTriangle, UserCheck,
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

interface Props {
  jamaahList: JamaahItem[]
  kurirList: Kurir[]
  isSuperAdmin: boolean
}

export default function PengantaranClient({ jamaahList, kurirList: initialKurirList, isSuperAdmin }: Props) {
  const [list, setList]         = useState<JamaahItem[]>(jamaahList)
  const [kurirList, setKurirList] = useState<Kurir[]>(initialKurirList)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<'SEMUA' | StatusAntar>('SEMUA')
  const [page, setPage]         = useState(1)
  const [perPage, setPerPage]   = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const keys = new Set<string>()
    for (const j of jamaahList) { keys.add(j.id_hewan ?? j.id) }
    return keys
  })
  const [loading, setLoading]   = useState(false)

  // Modal state: null = tutup
  const [modal, setModal] = useState<{
    ids: string[]
    statusAntar: StatusAntar
    kurirId: string       // id kurir dari daftar, atau '' jika custom/kosong
    kurirCustom: string   // teks manual jika tidak ada di daftar
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
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleCollapse(groupKey: string) {
    setCollapsed((prev) => { const n = new Set(prev); n.has(groupKey) ? n.delete(groupKey) : n.add(groupKey); return n })
  }
  function toggleGroupSelect(items: JamaahItem[]) {
    const ids = items.map((i) => i.id)
    const allSel = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const n = new Set(prev)
      ids.forEach((id) => { if (allSel) n.delete(id); else n.add(id) })
      return n
    })
  }

  function openModal(ids: string[], status: StatusAntar) {
    setModal({ ids, statusAntar: status, kurirId: '', kurirCustom: '', showCustom: false })
  }

  // Resolve nama kurir dari modal state
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
        body: JSON.stringify({
          ids: modal.ids,
          status_antar: modal.statusAntar,
          diantar_oleh: diantarOleh || null,
        }),
      })
      if (!res.ok) throw new Error()
      const now = new Date().toISOString()
      setList((prev) =>
        prev.map((j) =>
          modal.ids.includes(j.id)
            ? { ...j, status_antar: modal.statusAntar, waktu_antar: modal.statusAntar === 'BELUM_DIANTAR' ? null : now, diantar_oleh: diantarOleh || null }
            : j
        )
      )
      setSelected(new Set())
      setModal(null)
      const label = STATUS_ANTAR_CONFIG[modal.statusAntar].label
      toast.success(`${modal.ids.length} jamaah → ${label}`)
    } catch {
      toast.error('Gagal memperbarui status')
    } finally {
      setLoading(false)
    }
  }

  // Aksi cepat dari baris (tanpa modal jika tidak butuh kurir)
  function quickAction(ids: string[], status: StatusAntar) {
    if (status === 'BELUM_DIANTAR') {
      // Reset langsung tanpa konfirmasi kurir
      setModal({ ids, statusAntar: status, kurirId: '', kurirCustom: '', showCustom: false })
    } else {
      openModal(ids, status)
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(10px)', zIndex: 9999,
    display: 'flex', overflowY: 'auto', padding: '24px 16px',
  }

  const filterTabs: Array<{ key: 'SEMUA' | StatusAntar; label: string; color: string; count: number }> = [
    { key: 'SEMUA',          label: 'Semua',          color: 'rgba(255,255,255,0.5)', count: counts.SEMUA },
    { key: 'BELUM_DIANTAR',  label: 'Belum Diantar',  color: '#94a3b8',  count: counts.BELUM_DIANTAR },
    { key: 'SEDANG_DIANTAR', label: 'Sedang Diantar', color: '#fbbf24',  count: counts.SEDANG_DIANTAR },
    { key: 'SUDAH_DIANTAR',  label: 'Sudah Diantar',  color: '#34d399',  count: counts.SUDAH_DIANTAR },
    { key: 'GAGAL_DIANTAR',  label: 'Gagal Diantar',  color: '#f87171',  count: counts.GAGAL_DIANTAR },
  ]

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-5xl mx-auto animate-slide-up">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>
            Pengantaran
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>
            {list.length} jamaah siap dikirim
            {counts.GAGAL_DIANTAR > 0 && (
              <span style={{ marginLeft: 8, color: '#f87171', fontWeight: 600 }}>
                · {counts.GAGAL_DIANTAR} gagal diantar
              </span>
            )}
          </p>
        </div>
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['SEDANG_DIANTAR', 'SUDAH_DIANTAR', 'GAGAL_DIANTAR', 'BELUM_DIANTAR'] as StatusAntar[]).map((s) => {
              const cfg = STATUS_ANTAR_CONFIG[s]
              return (
                <button key={s} onClick={() => quickAction([...selected], s)}
                  style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                    cursor: 'pointer', border: `1px solid ${cfg.border}`,
                    background: cfg.bg, color: cfg.color,
                  }}>
                  {cfg.label} ({selected.size})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Filter pills */}
      <div className="hidden sm:flex" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {filterTabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', border: filter === t.key ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.08)',
              background: filter === t.key ? `${t.color}20` : 'rgba(255,255,255,0.04)',
              color: filter === t.key ? t.color : 'rgba(255,255,255,0.4)',
            }}>
            {t.label} <span style={{ opacity: 0.6 }}>({t.count})</span>
          </button>
        ))}
      </div>
      <div className="sm:hidden" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>
        {filterTabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{
              padding: '6px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: filter === t.key ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.08)',
              background: filter === t.key ? `${t.color}20` : 'rgba(255,255,255,0.04)',
              color: filter === t.key ? t.color : 'rgba(255,255,255,0.4)',
            }}>
            {t.label}<br /><span style={{ opacity: 0.6 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Search + per page */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, kode jamaah, kode resi…"
            style={{ ...G.input, paddingLeft: 36 }} />
        </div>
        <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}
          style={{ ...G.input, width: 'auto', minWidth: 90, cursor: 'pointer' }}>
          <option value={10}>10/hal</option>
          <option value={25}>25/hal</option>
          <option value={50}>50/hal</option>
          <option value={0}>Semua</option>
        </select>
      </div>

      {/* Groups */}
      {paginatedGroups.length === 0 && (
        <div style={{ ...G.card, padding: '48px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Tidak ada data</p>
        </div>
      )}

      {paginatedGroups.map((group) => {
        const h = group.hewan
        const groupKey = h?.id ?? 'lainnya'
        const isCollapsed = collapsed.has(groupKey)
        const allSel = group.items.every((i) => selected.has(i.id))
        const someSel = group.items.some((i) => selected.has(i.id))
        const isSapi = h?.jenis_hewan === 'SAPI'

        return (
          <div key={groupKey} style={{ ...G.card, marginBottom: 10 }}>
            {/* Group header */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => toggleCollapse(groupKey)}>
              <div onClick={(e) => { e.stopPropagation(); toggleGroupSelect(group.items) }}
                style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${allSel ? '#10b981' : someSel ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
                  background: allSel ? '#10b981' : someSel ? 'rgba(16,185,129,0.3)' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {(allSel || someSel) && <Check size={10} color="white" />}
              </div>
              {isSapi ? <Beef size={15} style={{ color: '#fb923c', flexShrink: 0 }} /> : <PawPrint size={15} style={{ color: '#a78bfa', flexShrink: 0 }} />}
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.88)', flex: 1 }}>
                {h?.kode_resi ?? 'Tidak dikelompokkan'}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{group.items.length} orang</span>
              {/* Quick action buttons untuk group */}
              <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                {(['SEDANG_DIANTAR', 'SUDAH_DIANTAR', 'GAGAL_DIANTAR'] as StatusAntar[]).map((s) => {
                  const cfg = STATUS_ANTAR_CONFIG[s]
                  return (
                    <button key={s} title={cfg.label}
                      onClick={() => quickAction(group.items.map((i) => i.id), s)}
                      style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', border: `1px solid ${cfg.border}`,
                        background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                      {s === 'SEDANG_DIANTAR' && <Truck size={10} />}
                      {s === 'SUDAH_DIANTAR' && <CheckCircle2 size={10} />}
                      {s === 'GAGAL_DIANTAR' && <AlertTriangle size={10} />}
                      <span className="hidden sm:inline">{s === 'SEDANG_DIANTAR' ? 'Sedang' : s === 'SUDAH_DIANTAR' ? 'Selesai' : 'Gagal'}</span>
                    </button>
                  )
                })}
              </div>
              {isCollapsed ? <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} /> : <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />}
            </div>

            {/* Rows */}
            {!isCollapsed && group.items.map((j, idx) => {
              const cfg = STATUS_ANTAR_CONFIG[j.status_antar]
              const isSel = selected.has(j.id)
              return (
                <div key={j.id}
                  style={{ padding: '10px 16px', borderBottom: idx < group.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: isSel ? 'rgba(16,185,129,0.05)' : 'transparent', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div onClick={() => toggleSelect(j.id)}
                    style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSel ? '#10b981' : 'rgba(255,255,255,0.15)'}`,
                      background: isSel ? '#10b981' : 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {isSel && <Check size={9} color="white" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{j.nama_lengkap}</span>
                      {j.atas_nama && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>a.n. {j.atas_nama}</span>}
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      {j.kode_jamaah && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}><User size={10} />{j.kode_jamaah}</span>}
                      {j.alamat_lengkap && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} />{j.alamat_lengkap}</span>}
                      {j.diantar_oleh && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}><UserCheck size={10} />{j.diantar_oleh}</span>}
                      {j.waktu_antar && j.status_antar !== 'BELUM_DIANTAR' && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} />{new Date(j.waktu_antar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {/* Keterangan gagal */}
                    {j.status_antar === 'GAGAL_DIANTAR' && (
                      <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={11} style={{ color: '#f87171', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#fca5a5' }}>Pengurban tidak ada / tidak bisa menerima — dikembalikan ke masjid</span>
                      </div>
                    )}
                  </div>
                  {/* Row quick action */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {(['SEDANG_DIANTAR', 'SUDAH_DIANTAR', 'GAGAL_DIANTAR', 'BELUM_DIANTAR'] as StatusAntar[])
                      .filter((s) => s !== j.status_antar)
                      .map((s) => {
                        const c = STATUS_ANTAR_CONFIG[s]
                        return (
                          <button key={s} title={c.label} onClick={() => quickAction([j.id], s)}
                            style={{ width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                              border: `1px solid ${c.border}`, background: c.bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {s === 'SEDANG_DIANTAR' && <Truck size={12} style={{ color: c.color }} />}
                            {s === 'SUDAH_DIANTAR' && <CheckCircle2 size={12} style={{ color: c.color }} />}
                            {s === 'GAGAL_DIANTAR' && <AlertTriangle size={12} style={{ color: c.color }} />}
                            {s === 'BELUM_DIANTAR' && <X size={12} style={{ color: c.color }} />}
                          </button>
                        )
                      })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', opacity: page === 1 ? 0.4 : 1 }}>
            ←
          </button>
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', opacity: page === totalPages ? 0.4 : 1 }}>
            →
          </button>
        </div>
      )}

      {/* ── MODAL: Konfirmasi Status + Pilih Kurir ─────────────────────────── */}
      {modal && (
        <ModalPortal>
          <div onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }} style={overlayStyle}>
            <div style={{
              margin: 'auto', width: '100%', maxWidth: 440,
              background: 'rgba(7,18,11,0.97)', backdropFilter: 'blur(36px)',
              border: '1px solid rgba(255,255,255,0.11)', borderTop: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.52)',
            }}>
              {/* Modal header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
                    {STATUS_ANTAR_CONFIG[modal.statusAntar].label}
                  </h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
                    {modal.ids.length} jamaah akan diupdate
                  </p>
                </div>
                <button onClick={() => setModal(null)}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Badge status */}
                {(() => {
                  const cfg = STATUS_ANTAR_CONFIG[modal.statusAntar]
                  return (
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {modal.statusAntar === 'GAGAL_DIANTAR' && <AlertTriangle size={14} style={{ color: cfg.color }} />}
                      {modal.statusAntar === 'SUDAH_DIANTAR' && <CheckCircle2 size={14} style={{ color: cfg.color }} />}
                      {modal.statusAntar === 'SEDANG_DIANTAR' && <Truck size={14} style={{ color: cfg.color }} />}
                      <span style={{ fontSize: 13, color: cfg.color, fontWeight: 600 }}>
                        {modal.statusAntar === 'GAGAL_DIANTAR'
                          ? 'Pengurban tidak ada / tidak bisa menerima — paket dikembalikan ke masjid'
                          : modal.statusAntar === 'BELUM_DIANTAR'
                            ? 'Status akan direset ke Belum Diantar'
                            : `Status berubah ke ${cfg.label}`}
                      </span>
                    </div>
                  )
                })()}

                {/* Pilih kurir — hanya tampil jika bukan BELUM_DIANTAR */}
                {modal.statusAntar !== 'BELUM_DIANTAR' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
                      Diantar Oleh <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none' }}>(opsional)</span>
                    </label>

                    {!modal.showCustom ? (
                      <div style={{ position: 'relative' }}>
                        <select
                          value={modal.kurirId}
                          onChange={(e) => setModal({ ...modal, kurirId: e.target.value })}
                          style={{ ...G.input, appearance: 'none', paddingRight: 36, cursor: 'pointer' }}>
                          <option value="">— Tidak dipilih —</option>
                          {kurirList.map((k) => (
                            <option key={k.id} value={k.id}>{k.nama}{k.no_hp ? ` (${k.no_hp})` : ''}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={modal.kurirCustom}
                        onChange={(e) => setModal({ ...modal, kurirCustom: e.target.value })}
                        placeholder="Tulis nama pengantar..."
                        style={G.input}
                        autoFocus
                      />
                    )}

                    <button
                      onClick={() => setModal({ ...modal, showCustom: !modal.showCustom, kurirId: '', kurirCustom: '' })}
                      style={{ marginTop: 8, fontSize: 11.5, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                      {modal.showCustom ? '← Pilih dari daftar kurir' : '+ Tulis nama sendiri'}
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10 }}>
                <button onClick={() => setModal(null)}
                  style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.55)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Batal
                </button>
                <button onClick={applyStatus} disabled={loading}
                  style={{
                    flex: 2, padding: 11, borderRadius: 12, color: 'white',
                    fontSize: 13.5, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    border: 'none', opacity: loading ? 0.6 : 1,
                    background: modal.statusAntar === 'GAGAL_DIANTAR'
                      ? 'linear-gradient(135deg,#dc2626,#ef4444)'
                      : modal.statusAntar === 'SUDAH_DIANTAR'
                        ? 'linear-gradient(135deg,#059669,#10b981)'
                        : 'linear-gradient(135deg,#d97706,#f59e0b)',
                  }}>
                  {loading ? 'Menyimpan…' : `Konfirmasi ${STATUS_ANTAR_CONFIG[modal.statusAntar].label}`}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
