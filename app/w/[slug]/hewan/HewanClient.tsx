'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Upload, Printer, Search, ChevronDown, ChevronUp,
  Copy, Beef, PawPrint, Phone, MapPin, X, Pencil, Trash2,
  ArrowRightLeft, AlertTriangle, Clock, Flame, Package, CheckCircle2,
  ShieldAlert, ClipboardList, Truck, CheckCheck, Scissors, PackageCheck,
  BadgeCheck,
} from 'lucide-react'
import { STATUS_CONFIG, STATUS_ORDER } from '@/types'
import type { StatusHewan, JenisHewan, Hewan, Jamaah, JamaahFormData, Periode, Role } from '@/types'
import { generateKodeResi } from '@/lib/utils'
import CetakPickerModal from '@/components/cetak/CetakPickerModal'
import LabelPVCModal from '@/components/cetak/LabelPVCModal'
import MarbotModal from '@/components/cetak/MarbotModal'
import PenyembelihanModal from '@/components/cetak/PenyembelihanModal'
import ImportModal from '@/components/import/ImportModal'
import * as XLSX from 'xlsx'

const EMPTY_JAMAAH: JamaahFormData = { nama_lengkap: '', atas_nama: '', no_hp: '', alamat_lengkap: '' }

type ModalType =
  | 'tambah'
  | 'editJamaah'
  | 'hapusJamaah'
  | 'hapusHewan'
  | 'pindahJamaah'
  | 'tambahKeHewan'
  | 'tukarKambing'
  | 'cetakPicker'
  | 'label'
  | 'marbot'
  | 'penyembelihan'
  | 'import'
  | 'hapusSemua'
  | 'arsipkanPeriode'
  | 'buatPeriode'
  | null

const STATUS_GLASS: Record<StatusHewan, { color: string; bg: string; border: string; dot: string; topBorder: string }> = {
  TERDAFTAR:         { color: '#94a3b8', bg: 'rgba(100,116,139,0.14)', border: 'rgba(148,163,184,0.22)', dot: '#64748b', topBorder: 'rgba(148,163,184,0.35)' },
  SAMPAI_MASJID:     { color: '#38bdf8', bg: 'rgba(14,165,233,0.14)',  border: 'rgba(56,189,248,0.22)',  dot: '#0ea5e9', topBorder: 'rgba(56,189,248,0.35)' },
  MENUNGGU_SEMBELIH: { color: '#94a3b8', bg: 'rgba(100,116,139,0.14)', border: 'rgba(148,163,184,0.22)', dot: '#64748b', topBorder: 'rgba(148,163,184,0.35)' },
  SEDANG_DISEMBELIH: { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)',  border: 'rgba(251,191,36,0.22)',  dot: '#f59e0b', topBorder: 'rgba(251,191,36,0.35)' },
  SUDAH_DISEMBELIH:  { color: '#fb923c', bg: 'rgba(249,115,22,0.14)',  border: 'rgba(251,146,60,0.22)',  dot: '#f97316', topBorder: 'rgba(251,146,60,0.35)' },
  PENCACAHAN:        { color: '#60a5fa', bg: 'rgba(59,130,246,0.14)',   border: 'rgba(96,165,250,0.22)',  dot: '#3b82f6', topBorder: 'rgba(96,165,250,0.35)' },
  PACKING:           { color: '#818cf8', bg: 'rgba(99,102,241,0.14)',   border: 'rgba(129,140,248,0.22)', dot: '#6366f1', topBorder: 'rgba(129,140,248,0.35)' },
  SELESAI:           { color: '#34d399', bg: 'rgba(16,185,129,0.14)',   border: 'rgba(52,211,153,0.22)',  dot: '#10b981', topBorder: 'rgba(52,211,153,0.35)' },
}

const STAT_ICON: Record<StatusHewan, React.ReactNode> = {
  TERDAFTAR:         <ClipboardList size={15} />,
  SAMPAI_MASJID:     <Truck size={15} />,
  MENUNGGU_SEMBELIH: <Clock size={15} />,
  SEDANG_DISEMBELIH: <Flame size={15} />,
  SUDAH_DISEMBELIH:  <CheckCheck size={15} />,
  PENCACAHAN:        <Scissors size={15} />,
  PACKING:           <PackageCheck size={15} />,
  SELESAI:           <CheckCircle2 size={15} />,
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
  iconBtn: (color = 'rgba(255,255,255,0.3)') => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    borderRadius: 7,
    transition: 'background 0.12s',
  } as React.CSSProperties),
}

interface Props {
  hewanList: Hewan[]
  jamaahList: Jamaah[]
  kambingCount: number
  workspaceId: string
  namaWorkspace: string
  periode: Periode
  userRole: Role
}

export default function HewanClient({ hewanList, jamaahList, kambingCount, workspaceId, namaWorkspace, periode, userRole }: Props) {
  const router = useRouter()
  const [hewan, setHewan] = useState<Hewan[]>(hewanList)
  const [jamaah, setJamaah] = useState<Jamaah[]>(jamaahList)
  const [modal, setModal] = useState<ModalType>(null)
  const [search, setSearch] = useState('')
  const [filterTipe, setFilterTipe] = useState<'SEMUA' | 'SAPI-A' | 'SAPI-B' | 'KAMBING'>('SEMUA')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  // Sync state dengan props baru setelah router.refresh() pasca-import
  useEffect(() => { setHewan(hewanList) }, [hewanList])
  useEffect(() => { setJamaah(jamaahList) }, [jamaahList])
  // Reset ke halaman 1 saat search / filter berubah
  useEffect(() => { setPage(1) }, [search, filterTipe])

  // ── State form Tambah ──
  const [jenisHewan, setJenisHewan] = useState<JenisHewan>('SAPI')
  const [sapiTipe, setSapiTipe] = useState<'A' | 'B'>('A')
  const [jamaahForms, setJamaahForms] = useState<JamaahFormData[]>([{ ...EMPTY_JAMAAH }])
  const maxJamaah = jenisHewan === 'SAPI' ? 7 : 1

  // ── State CRUD ──
  const [selectedJamaah, setSelectedJamaah] = useState<Jamaah | null>(null)
  const [selectedHewan, setSelectedHewan] = useState<Hewan | null>(null)
  const [editForm, setEditForm] = useState<JamaahFormData>(EMPTY_JAMAAH)
  const [pindahTargetId, setPindahTargetId] = useState<string>('')
  const [tambahKeHewanForm, setTambahKeHewanForm] = useState<JamaahFormData>(EMPTY_JAMAAH)

  const filtered = hewan.filter((h) => {
    // Filter tipe
    if (filterTipe === 'SAPI-A' && !h.kode_resi.startsWith('SAPI-A')) return false
    if (filterTipe === 'SAPI-B' && !h.kode_resi.startsWith('SAPI-B')) return false
    if (filterTipe === 'KAMBING' && h.jenis_hewan !== 'KAMBING') return false

    // Search: kosong = tampil semua
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()

    // Match kode resi atau kode publik
    if (h.kode_resi.toLowerCase().includes(q)) return true
    if (h.kode_publik.toLowerCase().includes(q)) return true

    // Match nama jamaah di dalamnya
    const jl = jamaah.filter((j) => j.id_hewan === h.id)
    if (jl.some((j) => j.nama_lengkap.toLowerCase().includes(q))) return true
    if (jl.some((j) => j.atas_nama?.toLowerCase().includes(q))) return true

    return false
  })
  const getJamaahFor = (idHewan: string) => jamaah.filter((j) => j.id_hewan === idHewan)
  const cetakData = hewan.map((h) => ({ hewan: h, jamaah: getJamaahFor(h.id) }))

  // Pagination
  const totalPages = perPage === 0 ? 1 : Math.ceil(filtered.length / perPage)
  const paginated  = perPage === 0 ? filtered : filtered.slice((page - 1) * perPage, page * perPage)

  // ── Helpers form Tambah ──
  function updateForm(idx: number, field: keyof JamaahFormData, val: string) {
    setJamaahForms((p) => p.map((j, i) => i === idx ? { ...j, [field]: val } : j))
  }
  function resetTambah() {
    setJenisHewan('SAPI'); setSapiTipe('A')
    setJamaahForms([{ ...EMPTY_JAMAAH }]); setModal(null)
  }

  // ── Preview kode berikutnya ──
  const sapiACount = hewan.filter((h) => h.kode_resi.startsWith('SAPI-A')).length
  const sapiBCount = hewan.filter((h) => h.kode_resi.startsWith('SAPI-B')).length
  const nextKodeSapiA   = generateKodeResi('SAPI', sapiACount + 1)         // index 1–9 → SAPI-A01–A09
  const nextKodeSapiB   = generateKodeResi('SAPI', 9 + sapiBCount + 1)     // index 10–18 → SAPI-B01–B09
  const nextKodeKambing = generateKodeResi('KAMBING', kambingCount + 1)

  // ── Hewan valid untuk pindah (same jenis, ada slot, bukan hewan sumber) ──
  function getPindahOptions(sumber: Hewan) {
    return hewan.filter((h) => {
      if (h.id === sumber.id) return false
      if (h.jenis_hewan !== sumber.jenis_hewan) return false
      const jumlah = getJamaahFor(h.id).length
      return jumlah < (h.jenis_hewan === 'SAPI' ? 7 : 1)
    })
  }

  // ── Kambing lain untuk tukar nomor ──
  function getTukarOptions(sumber: Hewan) {
    return hewan.filter((h) => h.id !== sumber.id && h.jenis_hewan === 'KAMBING')
  }

  // ══════════════════════════════════════════════════════
  // API HANDLERS
  // ══════════════════════════════════════════════════════

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

  async function handleEditJamaah() {
    if (!selectedJamaah) return
    if (!editForm.nama_lengkap.trim()) { toast.error('Nama lengkap wajib diisi'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/jamaah', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedJamaah.id, ...editForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setJamaah((p) => p.map((j) => j.id === data.jamaah.id ? data.jamaah : j))
      toast.success('Data jamaah diperbarui')
      setModal(null); setSelectedJamaah(null)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memperbarui')
    } finally {
      setSaving(false)
    }
  }

  async function handleHapusJamaah() {
    if (!selectedJamaah) return
    setSaving(true)
    try {
      const res = await fetch(`/api/jamaah?id=${selectedJamaah.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setJamaah((p) => p.filter((j) => j.id !== selectedJamaah.id))
      toast.success(`${selectedJamaah.nama_lengkap} dihapus dari daftar`)
      setModal(null); setSelectedJamaah(null)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghapus jamaah')
    } finally {
      setSaving(false)
    }
  }

  async function handleHapusHewan() {
    if (!selectedHewan) return
    setSaving(true)
    try {
      const res = await fetch(`/api/hewan?id=${selectedHewan.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHewan((p) => p.filter((h) => h.id !== selectedHewan.id))
      setJamaah((p) => p.filter((j) => j.id_hewan !== selectedHewan.id))
      if (expandedId === selectedHewan.id) setExpandedId(null)
      toast.success(`${data.kode_resi} dan semua jamaahnya dihapus`)
      setModal(null); setSelectedHewan(null)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghapus hewan')
    } finally {
      setSaving(false)
    }
  }

  async function handlePindahJamaah() {
    if (!selectedJamaah || !selectedHewan || !pindahTargetId) {
      toast.error('Pilih hewan tujuan terlebih dahulu'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/jamaah', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_jamaah: selectedJamaah.id, id_hewan_baru: pindahTargetId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setJamaah((p) => p.map((j) => j.id === data.jamaah.id ? data.jamaah : j))
      toast.success(`${selectedJamaah.nama_lengkap} dipindah ke ${data.kode_resi_baru}`)
      setModal(null); setSelectedJamaah(null); setSelectedHewan(null); setPindahTargetId('')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memindahkan jamaah')
    } finally {
      setSaving(false)
    }
  }

  async function handleTambahKeHewan() {
    if (!selectedHewan) return
    if (!tambahKeHewanForm.nama_lengkap.trim()) { toast.error('Nama lengkap wajib diisi'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/jamaah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_hewan: selectedHewan.id, jamaah: [tambahKeHewanForm] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setJamaah((p) => [...p, ...data.jamaah])
      toast.success(`${tambahKeHewanForm.nama_lengkap} ditambahkan ke ${selectedHewan.kode_resi}`)
      setModal(null); setSelectedHewan(null); setTambahKeHewanForm(EMPTY_JAMAAH)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menambah jamaah')
    } finally {
      setSaving(false)
    }
  }

  async function handleTukarKambing() {
    if (!selectedHewan || !pindahTargetId) { toast.error('Pilih kambing tujuan'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/hewan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_hewan_a: selectedHewan.id, id_hewan_b: pindahTargetId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Swap id_hewan di state jamaah lokal
      setJamaah((prev) => prev.map((j) => {
        if (data.ids_moved_to_b.includes(j.id)) return { ...j, id_hewan: pindahTargetId }
        if (data.ids_moved_to_a.includes(j.id)) return { ...j, id_hewan: selectedHewan.id }
        return j
      }))
      toast.success(`Nomor ditukar: ${data.swap}`)
      setModal(null); setSelectedHewan(null); setPindahTargetId('')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menukar nomor')
    } finally {
      setSaving(false)
    }
  }

  // ── Hapus Semua ────────────────────────────────────────────────────────
  const [hapusSemua_confirm, setHapusSemua_confirm] = useState('')
  const [arsipkanConfirm, setArsipkanConfirm] = useState('')
  const [buatPeriodeTahun, setBuatPeriodeTahun] = useState(new Date().getFullYear() + 1)
  const [buatPeriodeNama, setBuatPeriodeNama] = useState('')

  async function handleHapusSemua() {
    setSaving(true)
    try {
      const res = await fetch('/api/hewan/clear', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.deleted} hewan & ${data.jamaahDeleted} jamaah berhasil dihapus`)
      setHewan([])
      setJamaah([])
      setModal(null)
      setHapusSemua_confirm('')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghapus data')
    } finally {
      setSaving(false)
    }
  }

  async function handleArsipkanPeriode() {
    if (arsipkanConfirm !== 'ARSIPKAN') { toast.error('Ketik ARSIPKAN untuk konfirmasi'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/periode/arsipkan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Periode berhasil diarsipkan')
      setModal(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mengarsipkan periode')
    } finally {
      setSaving(false)
    }
  }

  async function handleBuatPeriode() {
    setSaving(true)
    try {
      const res = await fetch('/api/periode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahun: buatPeriodeTahun, nama_event: buatPeriodeNama || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Periode ${buatPeriodeTahun} berhasil dibuat`)
      setModal(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal membuat periode baru')
    } finally {
      setSaving(false)
    }
  }

  function copyKode(kodePublik: string) {
    navigator.clipboard.writeText(kodePublik)
    toast.success('Kode tracking disalin!')
  }

  const STAT_STATUSES: StatusHewan[] = STATUS_ORDER

  // Hewan yang benar-benar selesai: status SELESAI + semua jamaahnya SUDAH_DIANTAR
  const terkirimCount = hewan.filter(h => {
    if (h.status !== 'SELESAI') return false
    const heJamaah = jamaah.filter(j => j.id_hewan === h.id)
    return heJamaah.length > 0 && heJamaah.every(j => j.status_antar === 'SUDAH_DIANTAR')
  }).length

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════

  return (
    <div className="p-6 md:p-8 pb-20 md:pb-8 max-w-5xl mx-auto animate-slide-up">

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>
            Data Hewan Qurban
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>{hewan.length} hewan terdaftar</p>
        </div>
        {/* Mobile: grid 2×2 simetris | Desktop: flex row */}
        <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:w-auto md:gap-[10px]">
          <button onClick={() => setModal('cetakPicker')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, color: 'rgba(255,255,255,0.62)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={14} /> Cetak
          </button>
          <button onClick={() => setModal('import')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, color: 'rgba(255,255,255,0.62)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={14} /> Import Excel
          </button>
          <button
            onClick={() => { setHapusSemua_confirm(''); setModal('hapusSemua') }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 11, color: 'rgba(252,165,165,0.85)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Trash2 size={14} /> Hapus Semua
          </button>
          <button onClick={() => setModal('tambah')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 11, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.38)' }}>
            <Plus size={14} /> Tambah Kelompok
          </button>
        </div>
      </div>

      {/* Periode banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18,
        padding: '10px 16px', borderRadius: 12,
        background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
            Periode Aktif:
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>
            {periode.nama_event ?? `Qurban ${periode.tahun}`}
          </span>
        </div>
        {userRole === 'SUPER_ADMIN' && (
          <button
            onClick={() => { setArsipkanConfirm(''); setModal('arsipkanPeriode') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 8, color: 'rgba(251,191,36,0.85)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Tutup & Arsipkan Periode
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 10, marginBottom: 10 }}>
        {STAT_STATUSES.map((s) => {
          const sg = STATUS_GLASS[s]
          const cfg = STATUS_CONFIG[s]
          const count = hewan.filter((h) => h.status === s).length
          return (
            <div key={s} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderLeft: `3px solid ${sg.dot}`,
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: sg.color, opacity: 0.7 }}>{STAT_ICON[s]}</div>
                <span style={{ fontSize: 22, fontWeight: 800, color: count > 0 ? sg.color : 'rgba(255,255,255,0.22)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {count}
                </span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', margin: 0, letterSpacing: '0.2px' }}>{cfg.labelShort}</p>
            </div>
          )
        })}
      </div>

      {/* Terkirim card — hewan SELESAI + semua jamaah SUDAH_DIANTAR */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          background: terkirimCount > 0
            ? 'rgba(6,182,212,0.08)'
            : 'rgba(255,255,255,0.03)',
          border: terkirimCount > 0
            ? '1px solid rgba(6,182,212,0.25)'
            : '1px solid rgba(255,255,255,0.06)',
          borderLeft: `3px solid ${terkirimCount > 0 ? '#06b6d4' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BadgeCheck size={16} style={{ color: terkirimCount > 0 ? '#06b6d4' : 'rgba(255,255,255,0.2)' }} />
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: terkirimCount > 0 ? '#06b6d4' : 'rgba(255,255,255,0.25)', letterSpacing: '0.2px' }}>
                Terkirim
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
                Hewan siap distribusi &amp; semua jamaah sudah menerima daging
              </p>
            </div>
          </div>
          <span style={{
            fontSize: 26, fontWeight: 800,
            color: terkirimCount > 0 ? '#06b6d4' : 'rgba(255,255,255,0.18)',
            letterSpacing: '-0.5px', lineHeight: 1,
          }}>
            {terkirimCount}
          </span>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ marginBottom: 14 }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode resi, nama jamaah, kode publik..."
            style={{ ...G.input, paddingLeft: 40, paddingRight: 36, borderRadius: 12 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', padding: 3 }}>
              <X size={11} />
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, paddingBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500, marginRight: 2, flexShrink: 0 }}>Filter:</span>
          {([
            { key: 'SEMUA',   label: 'Semua',   count: hewan.length },
            { key: 'SAPI-A',  label: 'Sapi A',  count: hewan.filter(h => h.kode_resi.startsWith('SAPI-A')).length },
            { key: 'SAPI-B',  label: 'Sapi B',  count: hewan.filter(h => h.kode_resi.startsWith('SAPI-B')).length },
            { key: 'KAMBING', label: 'Kambing', count: hewan.filter(h => h.jenis_hewan === 'KAMBING').length },
          ] as const).map(({ key, label, count }) => {
            const active = filterTipe === key
            return (
              <button key={key} onClick={() => setFilterTipe(key)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: active ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: active ? '#34d399' : 'rgba(255,255,255,0.38)',
                border: active ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.07)',
              }}>
                {label}
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 16, textAlign: 'center',
                  padding: '1px 4px', borderRadius: 5,
                  background: active ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)',
                  color: active ? '#34d399' : 'rgba(255,255,255,0.3)',
                }}>{count}</span>
              </button>
            )
          })}
          {(search || filterTipe !== 'SEMUA') && (
            <button onClick={() => { setSearch(''); setFilterTipe('SEMUA') }}
              style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <X size={10} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* List hewan */}
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.09)',
        borderTop: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
      }}>
        {filtered.length === 0 && (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <Search size={32} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 14px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {search || filterTipe !== 'SEMUA'
                ? `Tidak ada hewan yang cocok${filterTipe !== 'SEMUA' ? ` di filter "${filterTipe === 'SAPI-A' ? 'Sapi A' : filterTipe === 'SAPI-B' ? 'Sapi B' : 'Kambing'}"` : ''}${search ? ` dengan kata kunci "${search}"` : ''}`
                : 'Belum ada data. Klik "Tambah Kelompok" untuk mulai.'}
            </p>
          </div>
        )}
        {paginated.map((h) => {
          const sg = STATUS_GLASS[h.status]
          const cfg = STATUS_CONFIG[h.status]
          const jList = getJamaahFor(h.id)
          const isExpanded = expandedId === h.id
          const isSapi = h.jenis_hewan === 'SAPI'
          return (
            <div key={h.id}>
              {/* Row hewan */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflow: 'hidden' }}>
                    <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 800, fontSize: 14, color: 'rgba(255,255,255,0.95)', whiteSpace: 'nowrap' }}>{h.kode_resi}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isSapi ? <Beef size={12} color="rgba(255,255,255,0.28)" /> : <PawPrint size={12} color="rgba(255,255,255,0.28)" />}
                      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.32)' }}>{jList.length} orang</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {/* Kode publik — hanya tampil di sm+ agar tidak sesak di mobile */}
                  <span className="hidden sm:inline" style={{
                    fontFamily: 'ui-monospace,monospace', fontSize: 10.5,
                    color: 'rgba(255,255,255,0.18)', letterSpacing: '0.5px',
                  }}>{h.kode_publik}</span>
                  {/* Divider */}
                  <span className="hidden sm:inline" style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                  {/* Status badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: sg.bg, color: sg.color, border: `1px solid ${sg.border}`,
                  }}>{cfg.labelShort}</div>
                  {isExpanded
                    ? <ChevronUp size={14} color="rgba(255,255,255,0.25)" />
                    : <ChevronDown size={14} color="rgba(255,255,255,0.25)" />}
                </div>
              </div>

              {/* Panel detail & jamaah */}
              {isExpanded && (
                <div style={{ background: 'rgba(16,185,129,0.03)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px' }}>
                  {/* Panel header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.3px' }}>
                        Jamaah
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 6 }}>
                        {jList.length} / {isSapi ? 7 : 1} slot terisi
                      </span>
                    </div>

                    {/* Action icon buttons — uniform 30×30 */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Tambah jamaah (jika ada slot) */}
                      {jList.length < (isSapi ? 7 : 1) && (
                        <button title="Tambah jamaah"
                          onClick={() => { setSelectedHewan(h); setTambahKeHewanForm(EMPTY_JAMAAH); setModal('tambahKeHewan') }}
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={13} />
                        </button>
                      )}
                      {/* Tukar nomor — kambing saja */}
                      {!isSapi && (
                        <button title="Tukar nomor kambing"
                          onClick={() => { setSelectedHewan(h); setPindahTargetId(''); setModal('tukarKambing') }}
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(96,165,250,0.25)', background: 'rgba(96,165,250,0.08)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ArrowRightLeft size={13} />
                        </button>
                      )}
                      {/* Salin kode publik */}
                      <button title={`Salin kode tracking (${h.kode_publik})`}
                        onClick={() => copyKode(h.kode_publik)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Copy size={13} />
                      </button>
                      {/* Separator */}
                      <span style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />
                      {/* Hapus hewan */}
                      <button title="Hapus hewan ini"
                        onClick={() => { setSelectedHewan(h); setModal('hapusHewan') }}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.07)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Grid jamaah */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
                    {jList.map((j, i) => (
                      <div key={j.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '11px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 11,
                        transition: 'background 0.12s',
                      }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', color: '#34d399', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>{j.nama_lengkap}</p>
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
                        {/* Action buttons per jamaah */}
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button title="Edit jamaah" onClick={(e) => {
                            e.stopPropagation()
                            setSelectedJamaah(j)
                            setSelectedHewan(h)
                            setEditForm({ nama_lengkap: j.nama_lengkap, atas_nama: j.atas_nama ?? '', no_hp: j.no_hp ?? '', alamat_lengkap: j.alamat_lengkap ?? '' })
                            setModal('editJamaah')
                          }} style={G.iconBtn('rgba(255,255,255,0.35)')}>
                            <Pencil size={12} />
                          </button>
                          {/* Pindah slot — hanya untuk sapi */}
                          {isSapi && (
                            <button title="Pindah ke sapi lain" onClick={(e) => {
                              e.stopPropagation()
                              setSelectedJamaah(j)
                              setSelectedHewan(h)
                              setPindahTargetId('')
                              setModal('pindahJamaah')
                            }} style={G.iconBtn('#60a5fa')}>
                              <ArrowRightLeft size={12} />
                            </button>
                          )}
                          <button title="Hapus jamaah" onClick={(e) => {
                            e.stopPropagation()
                            setSelectedJamaah(j)
                            setModal('hapusJamaah')
                          }} style={G.iconBtn('#f87171')}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {jList.length === 0 && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Belum ada jamaah</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination bar */}
      {filtered.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10, marginTop: 14, padding: '10px 4px',
        }}>
          {/* Keterangan */}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
            {perPage === 0
              ? `Menampilkan semua ${filtered.length} hewan`
              : `Menampilkan ${Math.min((page - 1) * perPage + 1, filtered.length)}–${Math.min(page * perPage, filtered.length)} dari ${filtered.length} hewan`}
          </span>

          {/* Navigasi halaman */}
          {perPage !== 0 && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Prev */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(255,255,255,0.04)', color: page === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)',
                  cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >‹</button>

              {/* Nomor halaman */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                  if (idx > 0 && (n as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(n)
                  return acc
                }, [])
                .map((n, i) =>
                  n === '…'
                    ? <span key={`e${i}`} style={{ width: 32, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>…</span>
                    : <button key={n} onClick={() => setPage(n as number)} style={{
                        width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: page === n ? '1px solid rgba(16,185,129,0.45)' : '1px solid rgba(255,255,255,0.09)',
                        background: page === n ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                        color: page === n ? '#34d399' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                      }}>{n}</button>
                )}

              {/* Next */}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(255,255,255,0.04)', color: page === totalPages ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)',
                  cursor: page === totalPages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >›</button>
            </div>
          )}

          {/* Selector per-halaman */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Tampilkan:</span>
            {[10, 20, 50, 0].map(n => (
              <button key={n} onClick={() => { setPerPage(n); setPage(1) }} style={{
                padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                border: perPage === n ? '1px solid rgba(16,185,129,0.45)' : '1px solid rgba(255,255,255,0.09)',
                background: perPage === n ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                color: perPage === n ? '#34d399' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
              }}>
                {n === 0 ? 'Semua' : n}
              </button>
            ))}
          </div>
        </div>
      )}

      {modal === 'tambah' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={G.modal}>
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0, letterSpacing: '-0.2px' }}>Tambah Kelompok Hewan</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.34)', margin: '4px 0 0' }}>Pilih jenis dan tipe hewan di bawah</p>
                </div>
                <button onClick={resetTambah} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 26px', overflowY: 'auto', flex: 1 }}>
              <div className="grid grid-cols-3" style={{ gap: 10, marginBottom: 20 }}>
                {([
                  { j: 'SAPI' as JenisHewan, label: 'Sapi Tipe A', sub: 'SAPI-A01, A02, ...', Icon: Beef },
                  { j: 'SAPI_B' as any,       label: 'Sapi Tipe B', sub: 'SAPI-B01, B02, ...', Icon: Beef },
                  { j: 'KAMBING' as JenisHewan, label: 'Kambing',   sub: 'Tipe C · KMB-001',  Icon: PawPrint },
                ] as const).map(({ j, label, sub, Icon }) => {
                  const isSapiB = j === 'SAPI_B'
                  const isKambing = j === 'KAMBING'
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
              <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 11.5, color: 'rgba(52,211,153,0.8)', margin: 0 }}>
                  Kode otomatis: <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: '#34d399' }}>
                    {jenisHewan === 'SAPI' ? (sapiTipe === 'B' ? nextKodeSapiB : nextKodeSapiA) : nextKodeKambing}
                  </span>
                  <span style={{ marginLeft: 8, opacity: 0.7 }}>· maks. {jenisHewan === 'SAPI' ? 7 : 1} jamaah</span>
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {jamaahForms.map((j, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.16)', color: '#34d399', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Jamaah #{idx + 1}</span>
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

      {/* ══════════════════════════════════════════════════════
          MODAL: Edit Jamaah
      ══════════════════════════════════════════════════════ */}
      {modal === 'editJamaah' && selectedJamaah && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...G.modal, maxWidth: 460 }}>
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Edit Jamaah</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.34)', margin: '4px 0 0' }}>
                    {selectedHewan?.kode_resi} · Jamaah #{getJamaahFor(selectedJamaah.id_hewan!).findIndex(j => j.id === selectedJamaah.id) + 1}
                  </p>
                </div>
                <button onClick={() => { setModal(null); setSelectedJamaah(null) }}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}>
                  <X size={15} />
                </button>
              </div>
            </div>
            <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" value={editForm.nama_lengkap}
                onChange={(e) => setEditForm((p) => ({ ...p, nama_lengkap: e.target.value }))}
                placeholder="Nama Lengkap *" style={G.input} />
              <input type="text" value={editForm.atas_nama ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, atas_nama: e.target.value }))}
                placeholder="Atas Nama / Keluarga (opsional)" style={G.input} />
              <input type="tel" value={editForm.no_hp ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, no_hp: e.target.value }))}
                placeholder="No. HP untuk notif WhatsApp" style={G.input} />
              <textarea value={editForm.alamat_lengkap ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, alamat_lengkap: e.target.value }))}
                placeholder="Alamat lengkap (untuk label)" rows={2}
                style={{ ...G.input, resize: 'none' }} />
            </div>
            <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setModal(null); setSelectedJamaah(null) }}
                style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleEditJamaah} disabled={saving}
                style={{ flex: 1, padding: 11, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ══════════════════════════════════════════════════════
          MODAL: Pindah Jamaah
      ══════════════════════════════════════════════════════ */}
      {modal === 'pindahJamaah' && selectedJamaah && selectedHewan && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...G.modal, maxWidth: 460 }}>
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Pindah Jamaah</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.34)', margin: '4px 0 0' }}>
                    Pindahkan <span style={{ color: '#34d399', fontWeight: 700 }}>{selectedJamaah.nama_lengkap}</span> dari {selectedHewan.kode_resi}
                  </p>
                </div>
                <button onClick={() => { setModal(null); setSelectedJamaah(null); setSelectedHewan(null) }}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}>
                  <X size={15} />
                </button>
              </div>
            </div>
            <div style={{ padding: '20px 26px', overflowY: 'auto', flex: 1 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: '0 0 12px' }}>
                Pilih hewan tujuan ({selectedHewan.jenis_hewan === 'SAPI' ? 'Sapi dengan slot tersisa' : 'Kambing kosong'}):
              </p>
              {(() => {
                const options = getPindahOptions(selectedHewan)
                if (options.length === 0) {
                  return (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <ArrowRightLeft size={28} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 10px', display: 'block' }} />
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                        Tidak ada hewan {selectedHewan.jenis_hewan === 'SAPI' ? 'sapi' : 'kambing'} lain dengan slot tersedia
                      </p>
                    </div>
                  )
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {options.map((h) => {
                      const jl = getJamaahFor(h.id)
                      const maxSlot = h.jenis_hewan === 'SAPI' ? 7 : 1
                      const active = pindahTargetId === h.id
                      return (
                        <button key={h.id}
                          onClick={() => setPindahTargetId(h.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                            background: active ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${active ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {h.jenis_hewan === 'SAPI' ? <Beef size={14} color={active ? '#34d399' : 'rgba(255,255,255,0.3)'} /> : <PawPrint size={14} color={active ? '#34d399' : 'rgba(255,255,255,0.3)'} />}
                            <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 13.5, fontWeight: 700, color: active ? '#34d399' : 'rgba(255,255,255,0.82)' }}>{h.kode_resi}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>
                            {jl.length}/{maxSlot} terisi
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
            <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setModal(null); setSelectedJamaah(null); setSelectedHewan(null) }}
                style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={handlePindahJamaah} disabled={saving || !pindahTargetId}
                style={{ flex: 1, padding: 11, background: pindahTargetId ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(59,130,246,0.2)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: pindahTargetId ? 'pointer' : 'not-allowed', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Memindahkan...' : 'Pindahkan'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ══════════════════════════════════════════════════════
          MODAL: Konfirmasi Hapus Jamaah
      ══════════════════════════════════════════════════════ */}
      {modal === 'hapusJamaah' && selectedJamaah && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...G.modal, maxWidth: 400 }}>
            <div style={{ padding: '28px 28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Trash2 size={22} color="#f87171" />
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.93)', margin: '0 0 8px' }}>Hapus Jamaah?</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{selectedJamaah.nama_lengkap}</span> akan dihapus dari daftar.<br />
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div style={{ padding: '0 28px 24px', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setModal(null); setSelectedJamaah(null) }}
                style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleHapusJamaah} disabled={saving}
                style={{ flex: 1, padding: 11, background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ══════════════════════════════════════════════════════
          MODAL: Konfirmasi Hapus Hewan
      ══════════════════════════════════════════════════════ */}
      {modal === 'hapusHewan' && selectedHewan && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...G.modal, maxWidth: 420 }}>
            <div style={{ padding: '28px 28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={22} color="#f87171" />
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.93)', margin: '0 0 8px' }}>Hapus Hewan Ini?</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 14px', lineHeight: 1.6 }}>
                <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: '#f87171' }}>{selectedHewan.kode_resi}</span> beserta{' '}
                <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{getJamaahFor(selectedHewan.id).length} jamaah</span> di dalamnya akan dihapus permanen.
              </p>
              <div style={{ padding: '10px 16px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 10, width: '100%' }}>
                <p style={{ fontSize: 11.5, color: '#f87171', margin: 0 }}>Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div style={{ padding: '0 28px 24px', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setModal(null); setSelectedHewan(null) }}
                style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleHapusHewan} disabled={saving}
                style={{ flex: 1, padding: 11, background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Menghapus...' : 'Ya, Hapus Semua'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ══════════════════════════════════════════════════════
          MODAL: Tambah Jamaah ke Hewan yang Sudah Ada
      ══════════════════════════════════════════════════════ */}
      {modal === 'tambahKeHewan' && selectedHewan && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...G.modal, maxWidth: 460 }}>
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Tambah Jamaah</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.34)', margin: '4px 0 0' }}>
                    <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: '#34d399' }}>{selectedHewan.kode_resi}</span>
                    {' · '}Slot tersisa: {(selectedHewan.jenis_hewan === 'SAPI' ? 7 : 1) - getJamaahFor(selectedHewan.id).length}
                  </p>
                </div>
                <button onClick={() => { setModal(null); setSelectedHewan(null); setTambahKeHewanForm(EMPTY_JAMAAH) }}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}>
                  <X size={15} />
                </button>
              </div>
            </div>
            <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" value={tambahKeHewanForm.nama_lengkap}
                onChange={(e) => setTambahKeHewanForm((p) => ({ ...p, nama_lengkap: e.target.value }))}
                placeholder="Nama Lengkap *" style={G.input} />
              <input type="text" value={tambahKeHewanForm.atas_nama ?? ''}
                onChange={(e) => setTambahKeHewanForm((p) => ({ ...p, atas_nama: e.target.value }))}
                placeholder="Atas Nama / Keluarga (opsional)" style={G.input} />
              <input type="tel" value={tambahKeHewanForm.no_hp ?? ''}
                onChange={(e) => setTambahKeHewanForm((p) => ({ ...p, no_hp: e.target.value }))}
                placeholder="No. HP untuk notif WhatsApp" style={G.input} />
              <textarea value={tambahKeHewanForm.alamat_lengkap ?? ''}
                onChange={(e) => setTambahKeHewanForm((p) => ({ ...p, alamat_lengkap: e.target.value }))}
                placeholder="Alamat lengkap (untuk label)" rows={2}
                style={{ ...G.input, resize: 'none' }} />
            </div>
            <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setModal(null); setSelectedHewan(null); setTambahKeHewanForm(EMPTY_JAMAAH) }}
                style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleTambahKeHewan} disabled={saving}
                style={{ flex: 1, padding: 11, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Menyimpan...' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ══════════════════════════════════════════════════════
          MODAL: Tukar Nomor Kambing
      ══════════════════════════════════════════════════════ */}
      {modal === 'tukarKambing' && selectedHewan && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...G.modal, maxWidth: 460 }}>
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Tukar Nomor Kambing</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.34)', margin: '4px 0 0' }}>
                    Tukar jamaah di <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: '#34d399' }}>{selectedHewan.kode_resi}</span> dengan kambing lain
                  </p>
                </div>
                <button onClick={() => { setModal(null); setSelectedHewan(null); setPindahTargetId('') }}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}>
                  <X size={15} />
                </button>
              </div>
            </div>
            <div style={{ padding: '20px 26px', overflowY: 'auto', flex: 1 }}>
              {/* Preview sumber */}
              <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dari</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0, fontFamily: 'ui-monospace,monospace' }}>
                  {selectedHewan.kode_resi}
                  {' · '}
                  <span style={{ fontFamily: 'inherit', fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>
                    {getJamaahFor(selectedHewan.id).map(j => j.nama_lengkap).join(', ') || '(kosong)'}
                  </span>
                </p>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: '0 0 10px' }}>Pilih kambing tujuan tukar:</p>
              {(() => {
                const opts = getTukarOptions(selectedHewan)
                if (opts.length === 0) return (
                  <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <PawPrint size={28} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Tidak ada kambing lain</p>
                  </div>
                )
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {opts.map((h) => {
                      const jl = getJamaahFor(h.id)
                      const active = pindahTargetId === h.id
                      return (
                        <button key={h.id} onClick={() => setPindahTargetId(h.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                            background: active ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${active ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          }}>
                          <div>
                            <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 13, fontWeight: 700, color: active ? '#60a5fa' : 'rgba(255,255,255,0.82)' }}>{h.kode_resi}</span>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                              {jl.map(j => j.nama_lengkap).join(', ') || '(kosong)'}
                            </span>
                          </div>
                          {active && <ArrowRightLeft size={14} color="#60a5fa" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
            <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setModal(null); setSelectedHewan(null); setPindahTargetId('') }}
                style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleTukarKambing} disabled={saving || !pindahTargetId}
                style={{ flex: 1, padding: 11, background: pindahTargetId ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(59,130,246,0.2)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: pindahTargetId ? 'pointer' : 'not-allowed', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Menukar...' : 'Tukar Nomor'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Modal Arsipkan Periode ─────────────────────────────── */}
      {modal === 'arsipkanPeriode' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div style={{ ...G.modal, maxWidth: 440 }}>
            <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.93)', margin: 0 }}>Tutup & Arsipkan Periode</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.5 }}>
                Periode <strong style={{ color: '#fbbf24' }}>{periode.nama_event ?? `Qurban ${periode.tahun}`}</strong> akan dikunci read-only dan dipindahkan ke halaman Arsip. Data tetap bisa dilihat kapan saja.
              </p>
            </div>
            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                  Ketik <strong style={{ color: '#fbbf24' }}>ARSIPKAN</strong> untuk konfirmasi
                </p>
                <input
                  value={arsipkanConfirm}
                  onChange={(e) => setArsipkanConfirm(e.target.value)}
                  placeholder="ARSIPKAN"
                  style={{ ...G.input, fontWeight: 700, letterSpacing: '0.5px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button
                  onClick={handleArsipkanPeriode}
                  disabled={saving || arsipkanConfirm !== 'ARSIPKAN'}
                  style={{ flex: 1, padding: '10px 0', background: arsipkanConfirm === 'ARSIPKAN' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${arsipkanConfirm === 'ARSIPKAN' ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: arsipkanConfirm === 'ARSIPKAN' ? '#fbbf24' : 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 700, cursor: arsipkanConfirm === 'ARSIPKAN' ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
                >
                  {saving ? 'Mengarsipkan...' : 'Arsipkan Periode'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cetak Modals */}
      {modal === 'cetakPicker' && createPortal(<CetakPickerModal onPilih={(t) => setModal(t as ModalType)} onClose={() => setModal(null)} />, document.body)}
      {modal === 'label' && createPortal(<LabelPVCModal data={cetakData} onClose={() => setModal(null)} onBack={() => setModal('cetakPicker')} />, document.body)}
      {modal === 'marbot' && createPortal(<MarbotModal data={cetakData} namaWorkspace={namaWorkspace} onClose={() => setModal(null)} onBack={() => setModal('cetakPicker')} />, document.body)}
      {modal === 'penyembelihan' && createPortal(<PenyembelihanModal data={cetakData} onClose={() => setModal(null)} onBack={() => setModal('cetakPicker')} />, document.body)}

      {/* Import Modal */}
      {modal === 'import' && (
        <ImportModal
          onClose={() => setModal(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Hapus Semua Modal */}
      {modal === 'hapusSemua' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ ...G.modal, maxWidth: 460 }}>
            {/* Header */}
            <div style={{ padding: '22px 24px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={18} color="#f87171" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.95)' }}>Hapus Semua Data</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} style={G.iconBtn()}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(252,165,165,0.9)', lineHeight: 1.6 }}>
                  Seluruh data hewan dan nama jamaah qurban dalam workspace ini akan <strong>dihapus permanen</strong>.
                  Gunakan fitur ini hanya jika import salah dan perlu diulang dari awal.
                </p>
              </div>

              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                Ketik <span style={{ fontFamily: 'ui-monospace,monospace', color: '#f87171', fontWeight: 700 }}>HAPUS SEMUA</span> untuk konfirmasi:
              </p>
              <input
                value={hapusSemua_confirm}
                onChange={(e) => setHapusSemua_confirm(e.target.value)}
                placeholder="HAPUS SEMUA"
                style={{ ...G.input, borderColor: hapusSemua_confirm === 'HAPUS SEMUA' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)' }}
              />
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => setModal(null)}
                style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={handleHapusSemua}
                disabled={saving || hapusSemua_confirm !== 'HAPUS SEMUA'}
                style={{ flex: 1, padding: '10px 0', background: hapusSemua_confirm === 'HAPUS SEMUA' ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 10, color: hapusSemua_confirm === 'HAPUS SEMUA' ? 'white' : 'rgba(252,165,165,0.4)', fontSize: 13, fontWeight: 700, cursor: hapusSemua_confirm === 'HAPUS SEMUA' ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
              >
                {saving ? 'Menghapus...' : 'Hapus Semua Data'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
