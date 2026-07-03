'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Archive, Plus, X } from 'lucide-react'
import type { Periode } from '@/types'

interface Props {
  periodeList: Periode[]
  isSuperAdmin: boolean
  slug: string
}

export default function ArsipPageClient({ periodeList, isSuperAdmin, slug }: Props) {
  const router = useRouter()
  const [showBuatModal, setShowBuatModal] = useState(false)
  const [tahun, setTahun] = useState(new Date().getFullYear() + 1)
  const [namaEvent, setNamaEvent] = useState('')
  const [saving, setSaving] = useState(false)

  const arsipList = periodeList.filter((p) => p.status === 'arsip')
  const periodeAktif = periodeList.find((p) => p.status === 'aktif') ?? null
  const tidakAdaAktif = !periodeAktif

  const G = {
    input: {
      width: '100%',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.09)',
      color: 'rgba(255,255,255,0.9)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 13.5,
      outline: 'none',
    } as React.CSSProperties,
  }

  async function handleBuatPeriode() {
    if (!tahun || tahun < 2020 || tahun > 2100) {
      toast.error('Tahun tidak valid')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/periode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahun,
          nama_event: namaEvent.trim() || `Qurban ${tahun}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Periode ${tahun} berhasil dibuat`)
      setShowBuatModal(false)
      router.push(`/w/${slug}/hewan`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal membuat periode baru')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-slide-up">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>
            Arsip Periode Qurban
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>
            {arsipList.length} periode terarsip &mdash; data read-only, tidak dapat diubah
          </p>
        </div>
        {/* Tombol Buat Periode Baru — hanya muncul kalau SUPER_ADMIN dan tidak ada periode aktif */}
        {isSuperAdmin && tidakAdaAktif && (
          <button
            onClick={() => {
              setTahun(new Date().getFullYear() + 1)
              setNamaEvent('')
              setShowBuatModal(true)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              border: 'none', borderRadius: 12,
              color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(16,185,129,0.38)',
            }}
          >
            <Plus size={15} /> Buat Periode Baru
          </button>
        )}
      </div>

      {/* Periode Aktif Info Card */}
      {periodeAktif ? (
        <div style={{
          marginBottom: 28, padding: '16px 20px', borderRadius: 14,
          background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', margin: 0, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Periode Aktif</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#34d399', margin: '2px 0 0' }}>
                {periodeAktif.nama_event ?? `Qurban ${periodeAktif.tahun}`}
              </p>
            </div>
          </div>
          <Link href={`/w/${slug}/hewan`} style={{
            padding: '8px 16px',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)',
            borderRadius: 9, color: '#34d399', fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
          }}>
            Buka Data Hewan
          </Link>
        </div>
      ) : (
        /* Tidak ada periode aktif — banner info */
        <div style={{
          marginBottom: 28, padding: '16px 20px', borderRadius: 14,
          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(251,191,36,0.85)', margin: 0 }}>
              Tidak ada periode aktif
            </p>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
              {isSuperAdmin
                ? 'Klik "Buat Periode Baru" untuk mulai input data qurban. Bisa dibuat untuk tahun berapa pun.'
                : 'Hubungi Super Admin untuk membuat periode baru.'}
            </p>
          </div>
        </div>
      )}

      {/* Arsip list */}
      {arsipList.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)' }}>Belum ada periode yang diarsipkan.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {arsipList.map((p) => (
            <div key={p.id} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: '2px solid rgba(251,191,36,0.3)',
              borderRadius: 16, padding: 20,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Archive size={13} color="rgba(251,191,36,0.6)" />
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.75)',
                    background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                    borderRadius: 6, padding: '2px 8px', letterSpacing: '0.4px',
                  }}>
                    ARSIP {p.tahun}
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                  {p.nama_event ?? `Qurban ${p.tahun}`}
                </h3>
                {p.diarsipkan_pada && (
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>
                    Diarsipkan {new Date(p.diarsipkan_pada).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href={`/w/${slug}/arsip/${p.tahun}`} style={{
                  display: 'block', textAlign: 'center', padding: '9px 0',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  Lihat Detail Arsip
                </Link>
                {/* Buka kembali: hanya kalau SUPER_ADMIN dan tidak ada periode aktif lain */}
                {isSuperAdmin && tidakAdaAktif && (
                  <Link href={`/w/${slug}/arsip/${p.tahun}`} style={{
                    display: 'block', textAlign: 'center', padding: '9px 0',
                    background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
                    borderRadius: 10, color: 'rgba(251,191,36,0.75)', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none',
                  }}>
                    Buka Kembali Arsip
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Buat Periode Baru */}
      {showBuatModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}>
          <div style={{
            background: 'rgba(7,18,11,0.97)',
            backdropFilter: 'blur(36px) saturate(150%)',
            WebkitBackdropFilter: 'blur(36px) saturate(150%)',
            border: '1px solid rgba(255,255,255,0.11)',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20, width: '100%', maxWidth: 440,
            boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.93)', margin: 0 }}>
                Buat Periode Baru
              </h3>
              <button
                onClick={() => setShowBuatModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.6 }}>
                Periode baru akan langsung menjadi aktif. Tahun bisa diisi bebas — tidak harus tahun sekarang.
              </p>

              {/* Input tahun */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 7 }}>
                  Tahun <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="number"
                  value={tahun}
                  onChange={(e) => setTahun(parseInt(e.target.value) || 0)}
                  min={2020}
                  max={2100}
                  style={{ ...G.input, fontWeight: 700, fontSize: 18, letterSpacing: '0.5px' }}
                />
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>
                  Contoh: 2027, 2028, dst
                </p>
              </div>

              {/* Input nama event (opsional) */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 7 }}>
                  Nama Event <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(opsional)</span>
                </label>
                <input
                  type="text"
                  value={namaEvent}
                  onChange={(e) => setNamaEvent(e.target.value)}
                  placeholder={`Qurban ${tahun}`}
                  style={G.input}
                />
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>
                  Kosongkan untuk pakai nama default: "Qurban {tahun}"
                </p>
              </div>

              {/* Preview */}
              <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', margin: '0 0 3px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Pratinjau</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#34d399', margin: 0 }}>
                  {namaEvent.trim() || `Qurban ${tahun}`}
                </p>
              </div>

              {/* Tombol aksi */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowBuatModal(false)}
                  style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  onClick={handleBuatPeriode}
                  disabled={saving || !tahun || tahun < 2020}
                  style={{
                    flex: 2, padding: '10px 0',
                    background: (!saving && tahun >= 2020) ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)',
                    border: 'none', borderRadius: 10,
                    color: (!saving && tahun >= 2020) ? 'white' : 'rgba(255,255,255,0.2)',
                    fontSize: 13, fontWeight: 700,
                    cursor: (!saving && tahun >= 2020) ? 'pointer' : 'not-allowed',
                    boxShadow: (!saving && tahun >= 2020) ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {saving ? 'Membuat...' : `Buat Periode ${tahun}`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
