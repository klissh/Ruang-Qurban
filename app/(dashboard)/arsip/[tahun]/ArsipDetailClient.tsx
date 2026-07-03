'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, ChevronDown, ChevronUp, ArrowLeft, Archive, Phone, MapPin, Lock } from 'lucide-react'
import Link from 'next/link'
import type { Hewan, Jamaah, Periode, Role } from '@/types'

interface Props {
  periode: Periode
  hewanList: Hewan[]
  jamaahList: Jamaah[]
  userRole: Role
  adaPeriodeAktifLain: boolean
}

export default function ArsipDetailClient({ periode, hewanList, jamaahList, userRole, adaPeriodeAktifLain }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterJenis, setFilterJenis] = useState<'SEMUA' | 'SAPI' | 'KAMBING'>('SEMUA')
  const [showBukaKembali, setShowBukaKembali] = useState(false)
  const [saving, setSaving] = useState(false)

  const getJamaahFor = (idHewan: string) => jamaahList.filter((j) => j.id_hewan === idHewan)

  const filtered = hewanList.filter((h) => {
    if (filterJenis === 'SAPI' && h.jenis_hewan !== 'SAPI') return false
    if (filterJenis === 'KAMBING' && h.jenis_hewan !== 'KAMBING') return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    if (h.kode_resi.toLowerCase().includes(q)) return true
    const jl = getJamaahFor(h.id)
    if (jl.some((j) => j.nama_lengkap.toLowerCase().includes(q))) return true
    if (jl.some((j) => j.alamat_lengkap?.toLowerCase().includes(q))) return true
    if (jl.some((j) => j.no_hp?.includes(q))) return true
    return false
  })

  const sapiCount = hewanList.filter((h) => h.jenis_hewan === 'SAPI').length
  const kambingCount = hewanList.filter((h) => h.jenis_hewan === 'KAMBING').length
  const totalJamaah = jamaahList.length

  async function handleBukaKembali() {
    setSaving(true)
    try {
      const res = await fetch('/api/periode/buka-kembali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periode_id: periode.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Periode ${periode.tahun} berhasil dibuka kembali`)
      setShowBukaKembali(false)
      router.push('/hewan')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal membuka kembali arsip')
    } finally {
      setSaving(false)
    }
  }

  const G = {
    input: {
      width: '100%', background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.9)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13.5, outline: 'none',
    } as React.CSSProperties,
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-slide-up">

      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/arsip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={14} /> Kembali ke Arsip
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Archive size={16} color="rgba(251,191,36,0.7)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(251,191,36,0.7)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Arsip {periode.tahun}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(100,116,139,0.15)', color: 'rgba(148,163,184,0.7)', border: '1px solid rgba(148,163,184,0.15)' }}>
                <Lock size={10} /> Read-only
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0, letterSpacing: '-0.5px' }}>
              {periode.nama_event ?? `Qurban ${periode.tahun}`}
            </h1>
            {periode.diarsipkan_pada && (
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>
                Diarsipkan pada {new Date(periode.diarsipkan_pada).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          {userRole === 'SUPER_ADMIN' && !adaPeriodeAktifLain && periode.status === 'arsip' && (
            <button
              onClick={() => setShowBukaKembali(true)}
              style={{ padding: '8px 16px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, color: 'rgba(251,191,36,0.8)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
            >
              Buka Kembali Arsip
            </button>
          )}
        </div>
      </div>

      {/* Stats summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Sapi', value: sapiCount, color: '#f97316' },
          { label: 'Kambing', value: kambingCount, color: '#34d399' },
          { label: 'Total Jamaah', value: totalJamaah, color: '#60a5fa' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '6px 0 0', fontWeight: 600 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode resi, nama, alamat, no HP..."
            style={{ ...G.input, paddingLeft: 40 }} />
        </div>
        {(['SEMUA', 'SAPI', 'KAMBING'] as const).map((f) => (
          <button key={f} onClick={() => setFilterJenis(f)} style={{
            padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: filterJenis === f ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            border: filterJenis === f ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.07)',
            color: filterJenis === f ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
          }}>{f}</button>
        ))}
      </div>

      {/* Hewan cards — read-only */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', paddingTop: 40, fontSize: 14 }}>Tidak ada data ditemukan</p>
        )}
        {filtered.map((h) => {
          const jList = getJamaahFor(h.id)
          const isOpen = expandedId === h.id
          return (
            <div key={h.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedId(isOpen ? null : h.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>{h.kode_resi}</span>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: h.jenis_hewan === 'SAPI' ? 'rgba(249,115,22,0.1)' : 'rgba(16,185,129,0.1)', color: h.jenis_hewan === 'SAPI' ? '#fb923c' : '#34d399', border: `1px solid ${h.jenis_hewan === 'SAPI' ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)'}`, fontWeight: 600 }}>{h.jenis_hewan}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{jList.length} jamaah</span>
                </div>
                {isOpen ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
              </button>
              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {jList.map((j, idx) => (
                    <div key={j.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', minWidth: 20 }}>{idx + 1}.</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{j.nama_lengkap}</span>
                        {j.atas_nama && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>a/n {j.atas_nama}</span>}
                      </div>
                      <div style={{ paddingLeft: 28, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                        {j.no_hp && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                            <Phone size={11} /> {j.no_hp}
                          </span>
                        )}
                        {j.alamat_lengkap && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                            <MapPin size={11} /> {j.alamat_lengkap}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {jList.length === 0 && (
                    <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '8px 0' }}>Tidak ada jamaah tercatat</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Buka Kembali — pakai createPortal agar tidak terjebak layout overflow */}
      {showBukaKembali && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'rgba(7,18,11,0.97)', backdropFilter: 'blur(36px)', WebkitBackdropFilter: 'blur(36px)', border: '1px solid rgba(255,255,255,0.11)', borderTop: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.52)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.93)', margin: '0 0 12px' }}>Buka Kembali Arsip?</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 20 }}>
              Periode <strong style={{ color: '#fbbf24' }}>{periode.nama_event ?? `Qurban ${periode.tahun}`}</strong> akan dijadikan periode aktif kembali. Semua data akan bisa diedit lagi.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowBukaKembali(false)} style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleBukaKembali} disabled={saving} style={{ flex: 1, padding: '10px 0', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, color: '#fbbf24', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Membuka...' : 'Ya, Buka Kembali'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
