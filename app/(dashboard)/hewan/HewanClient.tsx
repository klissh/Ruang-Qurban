'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Plus, Upload, Printer, Search, ChevronDown, ChevronUp, Copy, Beef, PawPrint, Phone, MapPin, X } from 'lucide-react'
import { STATUS_CONFIG } from '@/types'
import type { StatusHewan, JenisHewan, Hewan, Jamaah, JamaahFormData } from '@/types'
import { generateKodeResi } from '@/lib/utils'
import CetakPickerModal from '@/components/cetak/CetakPickerModal'
import LabelPVCModal from '@/components/cetak/LabelPVCModal'
import MarbotModal from '@/components/cetak/MarbotModal'
import PenyembelihanModal from '@/components/cetak/PenyembelihanModal'
import * as XLSX from 'xlsx'

const EMPTY_JAMAAH: JamaahFormData = { nama_lengkap: '', atas_nama: '', no_hp: '', alamat_lengkap: '' }
type ModalType = 'tambah' | 'cetakPicker' | 'label' | 'marbot' | 'penyembelihan' | null

const STATUS_GLASS: Record<StatusHewan, { color: string; bg: string; border: string; dot: string; topBorder: string }> = {
  BELUM_DISEMBELIH:  { color: '#94a3b8', bg: 'rgba(100,116,139,0.14)', border: 'rgba(148,163,184,0.22)', dot: '#64748b', topBorder: 'rgba(148,163,184,0.35)' },
  SEDANG_DISEMBELIH: { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)',  border: 'rgba(251,191,36,0.22)',  dot: '#f59e0b', topBorder: 'rgba(251,191,36,0.35)' },
  PENCACAHAN:        { color: '#60a5fa', bg: 'rgba(59,130,246,0.14)',   border: 'rgba(96,165,250,0.22)',  dot: '#3b82f6', topBorder: 'rgba(96,165,250,0.35)' },
  SELESAI:           { color: '#34d399', bg: 'rgba(16,185,129,0.14)',   border: 'rgba(52,211,153,0.22)',  dot: '#10b981', topBorder: 'rgba(52,211,153,0.35)' },
}

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
  modal: {
    background: 'rgba(7,18,11,0.97)',
    backdropFilter: 'blur(36px) saturate(150%)',
    WebkitBackdropFilter: 'blur(36px) saturate(150%)',
    border: '1px solid rgba(255,255,255,0.11)',
    borderTop: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90vh',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    boxShadow: '0 32px 80px rgba(0,0,0,0.52)',
  },
}

interface Props {
  hewanList: Hewan[]
  jamaahList: Jamaah[]
  kambingCount: number
  workspaceId: string
  namaWorkspace: string
}

export default function HewanClient({ hewanList, jamaahList, kambingCount, workspaceId, namaWorkspace }: Props) {
  const [hewan, setHewan] = useState<Hewan[]>(hewanList)
  const [jamaah, setJamaah] = useState<Jamaah[]>(jamaahList)
  const [modal, setModal] = useState<ModalType>(null)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [jenisHewan, setJenisHewan] = useState<JenisHewan>('SAPI')
  const [sapiTipe, setSapiTipe] = useState<'A' | 'B'>('A')
  const [jamaahForms, setJamaahForms] = useState<JamaahFormData[]>([{ ...EMPTY_JAMAAH }])
  const maxJamaah = jenisHewan === 'SAPI' ? 7 : 1
  const importRef = useRef<HTMLInputElement>(null)

  const filtered = hewan.filter((h) => h.kode_resi.toLowerCase().includes(search.toLowerCase()))
  const getJamaahFor = (idHewan: string) => jamaah.filter((j) => j.id_hewan === idHewan)
  const cetakData = hewan.map((h) => ({ hewan: h, jamaah: getJamaahFor(h.id) }))

  function updateForm(idx: number, field: keyof JamaahFormData, val: string) {
    setJamaahForms((p) => p.map((j, i) => i === idx ? { ...j, [field]: val } : j))
  }

  function resetTambah() {
    setJenisHewan('SAPI')
    setSapiTipe('A')
    setJamaahForms([{ ...EMPTY_JAMAAH }])
    setModal(null)
  }

  async function handleTambah() {
    const valid = jamaahForms.filter((j) => j.nama_lengkap.trim())
    if (!valid.length) { toast.error('Minimal 1 nama jamaah wajib diisi'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/jamaah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jenis_hewan: jenisHewan, tipe_sapi: jenisHewan === 'SAPI' ? sapiTipe : null, jamaah: valid, workspace_id: workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHewan((p) => [...p, data.hewan])
      setJamaah((p) => [...p, ...data.jamaah])
      toast.success(`${data.hewan.kode_resi} berhasil ditambahkan`)
      resetTambah()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<any>(ws)
        const valid = rows.filter((r: any) => r['nama_lengkap'] || r['Nama Lengkap'] || r['NAMA'])
        if (!valid.length) { toast.error('Kolom nama_lengkap tidak ditemukan di file'); return }
        toast.info(`${valid.length} baris ditemukan. Fitur import batch segera hadir.`)
      } catch { toast.error('Gagal membaca file Excel') }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  function copyKode(kodePublik: string) {
    navigator.clipboard.writeText(kodePublik)
    toast.success('Kode tracking disalin!')
  }

  // Preview kode untuk masing-masing tipe
  // Sapi A: hitung yang ada di group A (index 1-9), Sapi B: group B (index 10-18), dst
  // Hitung per-tipe dari live state (startsWith agar presisi)
  const sapiACount = hewan.filter((h) => h.kode_resi.startsWith('SAPI-A')).length
  const sapiBCount = hewan.filter((h) => h.kode_resi.startsWith('SAPI-B')).length
  const nextKodeSapiA   = generateKodeResi('SAPI', sapiACount + 1, 'A')
  const nextKodeSapiB   = generateKodeResi('SAPI', sapiBCount + 1, 'B')
  const nextKodeKambing = generateKodeResi('KAMBING', kambingCount + 1)

  const STAT_STATUSES: StatusHewan[] = ['BELUM_DISEMBELIH', 'SEDANG_DISEMBELIH', 'PENCACAHAN', 'SELESAI']

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-slide-up">

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>
            Data Hewan Qurban
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>{hewan.length} hewan terdaftar</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setModal('cetakPicker')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, color: 'rgba(255,255,255,0.62)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={14} /> Cetak
          </button>
          <button onClick={() => importRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, color: 'rgba(255,255,255,0.62)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={14} /> Import Excel
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileImport} />
          <button onClick={() => setModal('tambah')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 11, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.38)' }}>
            <Plus size={14} /> Tambah Kelompok
          </button>
        </div>
      </div>

      {/* Stats mini */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {STAT_STATUSES.map((s) => {
          const sg = STATUS_GLASS[s]
          const cfg = STATUS_CONFIG[s]
          return (
            <div key={s} style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderTop: `1px solid ${sg.topBorder}`,
              borderRadius: 14, padding: '14px 18px',
            }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: sg.color, lineHeight: 1, margin: '0 0 5px', letterSpacing: '-0.5px' }}>
                {hewan.filter((h) => h.status === s).length}
              </p>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.38)', margin: 0 }}>{cfg.labelShort}</p>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.28)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kode resi..."
          style={{ ...G.input, paddingLeft: 44, borderRadius: 13 }}
        />
      </div>

      {/* List */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderTop: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
      }}>
        {filtered.length === 0 && (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <Search size={32} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 14px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {search ? 'Tidak ditemukan' : 'Belum ada data. Klik "Tambah Kelompok" untuk mulai.'}
            </p>
          </div>
        )}
        {filtered.map((h, idx) => {
          const sg = STATUS_GLASS[h.status]
          const cfg = STATUS_CONFIG[h.status]
          const jList = getJamaahFor(h.id)
          const isExpanded = expandedId === h.id
          const isSapi = h.jenis_hewan === 'SAPI'
          return (
            <div key={h.id}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : h.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.045)',
                  background: isExpanded ? 'rgba(16,185,129,0.04)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: sg.dot, boxShadow: `0 0 7px ${sg.dot}99`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 800, fontSize: 14, color: 'rgba(255,255,255,0.95)' }}>{h.kode_resi}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isSapi ? <Beef size={12} color="rgba(255,255,255,0.28)" /> : <PawPrint size={12} color="rgba(255,255,255,0.28)" />}
                      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.32)' }}>{jList.length} orang</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{
                    fontFamily: 'ui-monospace,monospace', fontSize: 10.5,
                    color: 'rgba(255,255,255,0.22)',
                    background: 'rgba(255,255,255,0.05)', padding: '3px 8px',
                    borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)',
                  }}>{h.kode_publik}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyKode(h.kode_publik) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', display: 'flex', alignItems: 'center', padding: 0 }}
                    title="Salin kode tracking"
                  >
                    <Copy size={13} />
                  </button>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: sg.bg, color: sg.color, border: `1px solid ${sg.border}`,
                  }}>{cfg.labelShort}</div>
                  {isExpanded ? <ChevronUp size={14} color="rgba(255,255,255,0.28)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.28)" />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ background: 'rgba(16,185,129,0.03)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                      Daftar Jamaah
                    </p>
                    <button onClick={() => copyKode(h.kode_publik)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Copy size={11} /> Salin kode tracking
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
                    {jList.map((j, i) => (
                      <div key={j.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 9,
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10,
                      }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.82)', margin: 0 }}>{j.nama_lengkap}</p>
                          {j.atas_nama && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0' }}>({j.atas_nama})</p>}
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                            {j.no_hp && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Phone size={10} color="rgba(255,255,255,0.3)" />
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{j.no_hp}</span>
                              </div>
                            )}
                            {j.alamat_lengkap && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <MapPin size={10} color="rgba(255,255,255,0.3)" />
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{j.alamat_lengkap}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {jList.length === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Belum ada jamaah</p>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Tambah Kelompok */}
      {modal === 'tambah' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={G.modal}>
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0, letterSpacing: '-0.2px' }}>Tambah Kelompok Hewan</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.34)', margin: '4px 0 0' }}>
                    Pilih jenis dan tipe hewan di bawah
                  </p>
                </div>
                <button onClick={resetTambah} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 26px', overflowY: 'auto', flex: 1 }}>
              {/* Jenis hewan — 3 pilihan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {([
                  { j: 'SAPI' as JenisHewan, label: 'Sapi Tipe A', sub: 'SAPI-A01, A02, ...', Icon: Beef },
                  { j: 'SAPI_B' as any, label: 'Sapi Tipe B', sub: 'SAPI-B01, B02, ...', Icon: Beef },
                  { j: 'KAMBING' as JenisHewan, label: 'Kambing', sub: 'Tipe C · KMB-001', Icon: PawPrint },
                ] as const).map(({ j, label, sub, Icon }) => {
                  // SAPI_B juga pakai jenis SAPI di backend, tapi ditampilkan sebagai B
                  const isKambing = j === 'KAMBING'
                  const isSapiB = j === 'SAPI_B'
                  const active = isSapiB
                    ? (jenisHewan === 'SAPI' && sapiTipe === 'B')
                    : (!isSapiB && jenisHewan === j && !(sapiTipe === 'B' && j === 'SAPI'))
                  return (
                    <button key={String(j)}
                      onClick={() => {
                        if (isSapiB) { setJenisHewan('SAPI'); setSapiTipe('B') }
                        else if (isKambing) { setJenisHewan('KAMBING'); setSapiTipe('A') }
                        else { setJenisHewan('SAPI'); setSapiTipe('A') }
                        setJamaahForms([{ ...EMPTY_JAMAAH }])
                      }}
                      style={{
                        padding: '12px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        background: active ? 'rgba(16,185,129,0.16)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? 'rgba(16,185,129,0.36)' : 'rgba(255,255,255,0.08)'}`,
                        color: active ? '#34d399' : 'rgba(255,255,255,0.42)',
                      }}>
                      <Icon size={18} />
                      <span style={{ fontWeight: 700 }}>{label}</span>
                      <span style={{ fontSize: 10, opacity: 0.65, fontWeight: 400 }}>{sub}</span>
                    </button>
                  )
                })}
              </div>
              {/* Info otomatis */}
              <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 11.5, color: 'rgba(52,211,153,0.8)', margin: 0 }}>
                  Kode otomatis: <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: '#34d399' }}>
                    {jenisHewan === 'SAPI' ? (sapiTipe === 'B' ? nextKodeSapiB : nextKodeSapiA) : nextKodeKambing}
                  </span>
                  <span style={{ marginLeft: 8, opacity: 0.7 }}>· maks. {jenisHewan === 'SAPI' ? 7 : 1} jamaah</span>
                </p>
              </div>

              {/* Jamaah forms */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {jamaahForms.map((j, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.16)', color: '#34d399', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {idx + 1}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          Jamaah #{idx + 1}
                        </span>
                      </div>
                      {jamaahForms.length > 1 && (
                        <button onClick={() => setJamaahForms((p) => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 12 }}>Hapus</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input type="text" value={j.nama_lengkap} onChange={(e) => updateForm(idx, 'nama_lengkap', e.target.value)} placeholder="Nama Lengkap *" style={G.input} />
                      <input type="text" value={j.atas_nama ?? ''} onChange={(e) => updateForm(idx, 'atas_nama', e.target.value)} placeholder="Atas Nama / Keluarga (opsional)" style={G.input} />
                      <input type="tel" value={j.no_hp ?? ''} onChange={(e) => updateForm(idx, 'no_hp', e.target.value)} placeholder="No. HP untuk notif WhatsApp" style={G.input} />
                      <textarea value={j.alamat_lengkap ?? ''} onChange={(e) => updateForm(idx, 'alamat_lengkap', e.target.value)} placeholder="Alamat lengkap (untuk label)" rows={2} style={{ ...G.input, resize: 'none' }} />
                    </div>
                  </div>
                ))}
                {jamaahForms.length < maxJamaah && (
                  <button onClick={() => setJamaahForms((p) => [...p, { ...EMPTY_JAMAAH }])}
                    style={{ width: '100%', padding: 11, background: 'transparent', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <Plus size={13} /> Tambah Jamaah ({jamaahForms.length}/{maxJamaah})
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={resetTambah} style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleTambah} disabled={saving} style={{ flex: 1, padding: 11, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.38)', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Menyimpan...' : 'Simpan Kelompok'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Cetak Modals */}
      {modal === 'cetakPicker' && createPortal(<CetakPickerModal onPilih={(t) => setModal(t as ModalType)} onClose={() => setModal(null)} />, document.body)}
      {modal === 'label' && createPortal(<LabelPVCModal data={cetakData} onClose={() => setModal(null)} />, document.body)}
      {modal === 'marbot' && createPortal(<MarbotModal data={cetakData} namaWorkspace={namaWorkspace} onClose={() => setModal(null)} />, document.body)}
      {modal === 'penyembelihan' && createPortal(<PenyembelihanModal data={cetakData} onClose={() => setModal(null)} />, document.body)}
    </div>
  )
}
