// ============================================================
// PORTAL TRACKING QURBAN — Type Definitions
// ============================================================

export type Role = 'SUPER_ADMIN' | 'ADMIN_PENDAFTARAN' | 'PETUGAS_LAPANGAN'

export type JenisHewan = 'SAPI' | 'KAMBING'

export type StatusHewan =
  | 'BELUM_DISEMBELIH'
  | 'SEDANG_DISEMBELIH'
  | 'PENCACAHAN'
  | 'SELESAI'

// ============================================================
// Database Row Types
// ============================================================

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
  id_hewan: string | null
  nama_lengkap: string
  atas_nama: string | null   // nama keluarga jika mewakili
  no_hp: string | null
  alamat_lengkap: string | null
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
  BELUM_DISEMBELIH: {
    label: 'Persiapan',
    labelShort: 'Persiapan',
    step: 1,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
  SEDANG_DISEMBELIH: {
    label: 'Sedang Disembelih',
    labelShort: 'Disembelih',
    step: 2,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  PENCACAHAN: {
    label: 'Pencacahan & Pengemasan',
    labelShort: 'Pencacahan',
    step: 3,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  SELESAI: {
    label: 'Selesai / Siap Distribusi',
    labelShort: 'Selesai',
    step: 4,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
  },
}

export const STATUS_ORDER: StatusHewan[] = [
  'BELUM_DISEMBELIH',
  'SEDANG_DISEMBELIH',
  'PENCACAHAN',
  'SELESAI',
]

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
