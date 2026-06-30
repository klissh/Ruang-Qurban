'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Upload, Printer, Search, ChevronDown, ChevronUp, Copy } from 'lucide-react'
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

interface Props {
  hewanList: Hewan[]
  jamaahList: Jamaah[]
  sapiCount: number
  kambingCount: number
  workspaceId: string
  namaWorkspace: string
}

export default function HewanClient({ hewanList, jamaahList, sapiCount, kambingCount, workspaceId, namaWorkspace }: Props) {
  const [hewan, setHewan] = useState<Hewan[]>(hewanList)
  const [jamaah, setJamaah] = useState<Jamaah[]>(jamaahList)
  const [modal, setModal] = useState<ModalType>(null)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state untuk Tambah Kelompok
  const [jenisHewan, setJenisHewan] = useState<JenisHewan>('SAPI')
  const [jamaahForms, setJamaahForms] = useState<JamaahFormData[]>([{ ...EMPTY_JAMAAH }])
  const maxJamaah = jenisHewan === 'SAPI' ? 7 : 1
  const importRef = useRef<HTMLInputElement>(null)

  const filtered = hewan.filter((h) =>
    h.kode_resi.toLowerCase().includes(search.toLowerCase())
  )

  const getJamaahFor = (idHewan: string) => jamaah.filter((j) => j.id_hewan === idHewan)
  const cetakData = hewan.map((h) => ({ hewan: h, jamaah: getJamaahFor(h.id) }))

  // ── Tambah Kelompok ──
  function updateForm(idx: number, field: keyof JamaahFormData, val: string) {
    setJamaahForms((p) => p.map((j, i) => i === idx ? { ...j, [field]: val } : j))
  }

  function resetTambah() {
    setJenisHewan('SAPI')
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
        body: JSON.stringify({ jenis_hewan: jenisHewan, jamaah: valid, workspace_id: workspaceId }),
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

  // ── Import Excel ──
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
        toast.info(`${valid.length} baris ditemukan di Excel. Fitur import batch segera hadir.`)
      } catch { toast.error('Gagal membaca file Excel') }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  function copyLink(kodePublik: string) {
    navigator.clipboard.writeText(`${window.location.origin}/tracking?kode=${kodePublik}`)
    toast.success('Link tracking disalin!')
  }

  const nextKodeSapi = generateKodeResi('SAPI', sapiCount + 1)
  const nextKodeKambing = generateKodeResi('KAMBING', kambingCount + 1)

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Hewan Qurban</h1>
          <p className="text-gray-400 text-sm mt-0.5">{hewan.length} hewan terdaftar</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setModal('cetakPicker')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <Printer size={15} /> Cetak
          </button>
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <Upload size={15} /> Import Excel
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
          <button onClick={() => setModal('tambah')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition">
            <Plus size={15} /> Tambah Kelompok
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {(['BELUM_DISEMBELIH', 'SEDANG_DISEMBELIH', 'PENCACAHAN', 'SELESAI'] as StatusHewan[]).map((s) => {
          const c = STATUS_CONFIG[s]
          return (
            <div key={s} className={`rounded-xl p-4 ${c.bgColor}`}>
              <p className={`text-2xl font-bold ${c.color}`}>{hewan.filter((h) => h.status === s).length}</p>
              <p className={`text-xs font-medium mt-0.5 ${c.color} opacity-75`}>{c.labelShort}</p>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kode resi..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* List Hewan */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            {search ? 'Tidak ditemukan' : 'Belum ada data. Klik "Tambah Kelompok" untuk mulai.'}
          </div>
        )}
        {filtered.map((h, idx) => {
          const c = STATUS_CONFIG[h.status]
          const jList = getJamaahFor(h.id)
          const isExpanded = expandedId === h.id
          return (
            <div key={h.id} className={idx > 0 ? 'border-t border-gray-50' : ''}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : h.id)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-gray-900">{h.kode_resi}</span>
                    <span className="text-xs text-gray-400">{h.jenis_hewan === 'SAPI' ? '🐄' : '🐐'} {jList.length} orang</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{h.kode_publik}</span>
                  <button onClick={(e) => { e.stopPropagation(); copyLink(h.kode_publik) }}
                    className="hidden md:flex items-center text-emerald-600 hover:text-emerald-700" title="Salin link tracking">
                    <Copy size={13} />
                  </button>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.bgColor} ${c.color}`}>{c.labelShort}</span>
                  {isExpanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="bg-gray-50 border-t border-gray-100 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Daftar Jamaah</p>
                    <button onClick={() => copyLink(h.kode_publik)}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                      <Copy size={11} /> Salin link tracking
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {jList.map((j, i) => (
                      <div key={j.id} className="flex items-start gap-2.5 bg-white rounded-lg px-3 py-2 border border-gray-100">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{j.nama_lengkap}</p>
                          {j.atas_nama && <p className="text-xs text-gray-400">({j.atas_nama})</p>}
                          <div className="flex gap-3 flex-wrap">
                            {j.no_hp && <p className="text-xs text-gray-400">📱 {j.no_hp}</p>}
                            {j.alamat_lengkap && <p className="text-xs text-gray-400 truncate">📍 {j.alamat_lengkap}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {jList.length === 0 && <p className="text-xs text-gray-400">Belum ada jamaah</p>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modal Tambah Kelompok ── */}
      {modal === 'tambah' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-lg">Tambah Kelompok Hewan</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Kode otomatis: <span className="font-mono font-bold text-emerald-600">{jenisHewan === 'SAPI' ? nextKodeSapi : nextKodeKambing}</span>
              </p>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                {(['SAPI', 'KAMBING'] as JenisHewan[]).map((j) => (
                  <button key={j} onClick={() => { setJenisHewan(j); setJamaahForms([{ ...EMPTY_JAMAAH }]) }}
                    className={`py-3 rounded-xl border-2 text-sm font-medium transition
                      ${jenisHewan === j ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
                    {j === 'SAPI' ? '🐄 Sapi (maks. 7)' : '🐐 Kambing (1)'}
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                {jamaahForms.map((j, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-gray-500">Jamaah #{idx + 1}</span>
                      {jamaahForms.length > 1 && (
                        <button onClick={() => setJamaahForms((p) => p.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input type="text" value={j.nama_lengkap} onChange={(e) => updateForm(idx, 'nama_lengkap', e.target.value)}
                        placeholder="Nama Lengkap *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <input type="text" value={j.atas_nama ?? ''} onChange={(e) => updateForm(idx, 'atas_nama', e.target.value)}
                        placeholder="Atas Nama / Keluarga (opsional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <input type="tel" value={j.no_hp ?? ''} onChange={(e) => updateForm(idx, 'no_hp', e.target.value)}
                        placeholder="No. HP untuk notif WhatsApp" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <textarea value={j.alamat_lengkap ?? ''} onChange={(e) => updateForm(idx, 'alamat_lengkap', e.target.value)}
                        placeholder="Alamat lengkap (untuk label)" rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                    </div>
                  </div>
                ))}
                {jamaahForms.length < maxJamaah && (
                  <button onClick={() => setJamaahForms((p) => [...p, { ...EMPTY_JAMAAH }])}
                    className="w-full py-2.5 border-2 border-dashed border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600 rounded-xl text-sm transition">
                    + Tambah Jamaah ({jamaahForms.length}/{maxJamaah})
                  </button>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button onClick={resetTambah} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium">Batal</button>
              <button onClick={handleTambah} disabled={saving}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-sm font-medium transition">
                {saving ? 'Menyimpan...' : 'Simpan Kelompok'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cetak Modals ── */}
      {modal === 'cetakPicker' && <CetakPickerModal onPilih={(t) => setModal(t as ModalType)} onClose={() => setModal(null)} />}
      {modal === 'label' && <LabelPVCModal data={cetakData} onClose={() => setModal(null)} />}
      {modal === 'marbot' && <MarbotModal data={cetakData} namaWorkspace={namaWorkspace} onClose={() => setModal(null)} />}
      {modal === 'penyembelihan' && <PenyembelihanModal data={cetakData} onClose={() => setModal(null)} />}
    </div>
  )
}
