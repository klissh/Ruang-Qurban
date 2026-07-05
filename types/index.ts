// ============================================================
// PORTAL TRACKING QURBAN — Type Definitions
// ============================================================

export type Role = 'SUPER_ADMIN' | 'ADMIN_PENDAFTARAN' | 'PETUGAS_LAPANGAN'

export type JenisHewan = 'SAPI' | 'KAMBING'

export type StatusHewan =
  | 'TERDAFTAR'
  | 'SAMPAI_MASJID'
  | 'MENUNGGU_SEMBELIH'
  | 'SEDANG_DISEMBELIH'
  | 'SUDAH_DISEMBELIH'
  | 'PENCACAHAN'
  | 'PACKING'
  | 'SELESAI'

export type StatusAntar =
  | 'BELUM_DIANTAR'
  | 'SEDANG_DIANTAR'
  | 'SUDAH_DIANTAR'
  | 'GAGAL_DIANTAR'

export interface Kurir {
  id: string
  id_workspace: string
  nama: string
  no_hp: string | null
  created_at: string
  updated_at: string
}

export type StatusPeriode = 'aktif' | 'arsip'

// ============================================================
// Database Row Types
// ============================================================

export interface Periode {
  id: string
  id_workspace: string
  tahun: number
  nama_event: string | null
  tanggal_penyembelihan: string | null
  status: StatusPeriode
  diarsipkan_oleh: string | null
  diarsipkan_pada: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  nama: string
  logo_url: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Profile {
  id: string
  id_workspace: string | null
  nama_lengkap: string
  role: Role
  created_at: string
  updated_at: string
}

export interface Hewan {
  id: string
  id_workspace: string
  periode_id: string
  kode_resi: string        // SAPI-A01 (internal, untuk panitia)
  kode_publik: string      // X7KQ-2M9R (acak, untuk jamaah)
  jenis_hewan: JenisHewan
  status: StatusHewan
  url_dokumentasi: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Jamaah {
  id: string
  id_workspace: string
  periode_id: string
  id_hewan: string | null
  nama_lengkap: string
  atas_nama: string | null   // nama keluarga jika mewakili
  no_hp: string | null
  alamat_lengkap: string | null
  kode_jamaah: string | null   // kode resi per-orang, auto-generate via trigger DB
  status_antar: StatusAntar
  waktu_antar: string | null
  diantar_oleh: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface StatusLog {
  id: string
  id_hewan: string
  id_user: string | null
  nama_user: string | null
  status_lama: StatusHewan | null
  status_baru: StatusHewan
  created_at: string
}

// ============================================================
// Joined / Extended Types
// ============================================================

export interface HewanWithJamaah extends Hewan {
  jamaah: Jamaah[]
}

export interface HewanWithLog extends HewanWithJamaah {
  status_log: StatusLog[]
}

// ============================================================
// Status Config (label, warna, urutan)
// ============================================================

export const STATUS_CONFIG: Record<StatusHewan, {
  label: string
  labelShort: string
  step: number
  color: string
  bgColor: string
}> = {
  TERDAFTAR: {
    label: 'Terdaftar',
    labelShort: 'Terdaftar',
    step: 1,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
  SAMPAI_MASJID: {
    label: 'Hewan Sampai Masjid',
    labelShort: 'Sampai Masjid',
    step: 2,
    color: 'text-sky-700',
    bgColor: 'bg-sky-100',
  },
  MENUNGGU_SEMBELIH: {
    label: 'Menunggu Penyembelihan',
    labelShort: 'Menunggu',
    step: 3,
    color: 'text-slate-700',
    bgColor: 'bg-slate-200',
  },
  SEDANG_DISEMBELIH: {
    label: 'Sedang Disembelih',
    labelShort: 'Disembelih',
    step: 4,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  SUDAH_DISEMBELIH: {
    label: 'Sudah Disembelih',
    labelShort: 'Sudah Disembelih',
    step: 5,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  PENCACAHAN: {
    label: 'Proses Pencacahan',
    labelShort: 'Pencacahan',
    step: 6,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  PACKING: {
    label: 'Proses Packing',
    labelShort: 'Packing',
    step: 7,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  SELESAI: {
    label: 'Siap Distribusi',
    labelShort: 'Siap Distribusi',
    step: 8,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
  },
}

export const STATUS_ORDER: StatusHewan[] = [
  'TERDAFTAR',
  'SAMPAI_MASJID',
  'MENUNGGU_SEMBELIH',
  'SEDANG_DISEMBELIH',
  'SUDAH_DISEMBELIH',
  'PENCACAHAN',
  'PACKING',
  'SELESAI',
]

// ============================================================
// Status Antar Config (label, warna) — monitoring pengantaran
// ============================================================

export const STATUS_ANTAR_CONFIG: Record<StatusAntar, {
  label: string
  color: string
  bg: string
  border: string
  dot: string
}> = {
  BELUM_DIANTAR: {
    label: 'Belum Diantar',
    color: '#94a3b8',
    bg: 'rgba(100,116,139,0.14)',
    border: 'rgba(148,163,184,0.22)',
    dot: '#64748b',
  },
  SEDANG_DIANTAR: {
    label: 'Sedang Diantar',
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.14)',
    border: 'rgba(251,191,36,0.22)',
    dot: '#f59e0b',
  },
  SUDAH_DIANTAR: {
    label: 'Sudah Diantar',
    color: '#34d399',
    bg: 'rgba(16,185,129,0.14)',
    border: 'rgba(52,211,153,0.22)',
    dot: '#10b981',
  },
  GAGAL_DIANTAR: {
    label: 'Gagal Diantar',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.14)',
    border: 'rgba(248,113,113,0.22)',
    dot: '#ef4444',
  },
}

// ============================================================
// PDF / Print Config
// ============================================================

export interface LabelConfig {
  lebarMm: number
  tinggiMm: number
  ukuranKertas: 'A4' | 'F4'
  kolomPerBaris: number
}

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
  lebarMm: 85.6,
  tinggiMm: 53.98,
  ukuranKertas: 'A4',
  kolomPerBaris: 2,
}

export interface PenyembelihanConfig {
  namaPerLembar: number
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface TrackingResult {
  hewan: Hewan
  jamaah: Jamaah[]
}

// ============================================================
// Form Types
// ============================================================

export interface JamaahFormData {
  nama_lengkap: string
  atas_nama?: string
  no_hp?: string
  alamat_lengkap?: string
}

export interface HewanFormData {
  jenis_hewan: JenisHewan
  jamaah: JamaahFormData[]
}
