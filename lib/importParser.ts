// ============================================================
// lib/importParser.ts
// Parser untuk import data Qurban dari Excel / CSV
// Mendukung 2 format:
//   1. "gforms"  — export langsung dari Google Forms Pendaftaran
//   2. "simple"  — template sederhana buatan sistem
// ============================================================

export type ImportTipe = 'SAPI-A' | 'SAPI-B' | 'KAMBING'

export interface ImportedJamaah {
  nama_lengkap: string
  no_hp?: string
  alamat_lengkap?: string
}

export interface ImportedKelompok {
  tipe: ImportTipe
  pendaftarNama: string
  pendaftarHp: string
  pendaftarAlamat: string
  jamaahList: ImportedJamaah[]
}

export interface ParseResult {
  kelompokList: ImportedKelompok[]
  errors: string[]
  skippedRows: number
  format: 'gforms' | 'simple' | 'unknown'
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Bersihkan satu nama dari prefix seperti:
 * "1.", "2.", "1)", "2)", "TIPE A,", "Type B", "(Ahmad bin ...)", dll.
 */
export function cleanNama(raw: string | null | undefined): string {
  if (!raw) return ''
  let s = String(raw).trim()
  if (!s || s === '.' || s === '-' || s === '(-)') return ''

  // Hapus prefix "TIPE A," / "TIPE B," / "Type A," (case insensitive)
  s = s.replace(/^(tipe|type)\s+[a-c]\s*[,\s]*/gi, '').trim()

  // Hapus prefix angka: "1.", "2.", "1)", "2)" — termasuk yang dengan spasi
  s = s.replace(/^\d+\s*[.)]\s*/g, '').trim()

  // Hapus tanda kurung jika seluruh string dibungkus "( ... )"
  if (s.startsWith('(') && s.endsWith(')')) {
    s = s.slice(1, -1).trim()
  } else {
    // Hapus kurung pembuka / penutup yang tergantung
    s = s.replace(/^\(\s*/, '').replace(/\)\s*$/, '').trim()
  }

  // Hapus koma di akhir
  s = s.replace(/,\s*$/, '').trim()

  return s
}

/**
 * Pecah sel multi-baris (TIPE B) menjadi array nama.
 * Pisahan: newline (\n). Setiap baris dibersihkan via cleanNama.
 */
function splitMultilineNama(raw: string): string[] {
  if (!raw || raw.trim() === '.' || raw.trim() === '-') return []
  return raw
    .split('\n')
    .map((line) => cleanNama(line.trim()))
    .filter((n) => n.length >= 2)
}

/** Normalisasi string untuk perbandingan (lowercase, trim, spasi tunggal) */
function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
}

// ─── Column names untuk Google Forms format ───────────────────────────────
const COL_PENDAFTAR = 'Nama pendaftar'
const COL_ALAMAT    = 'Alamat lengkap'
const COL_HP        = 'Nomor HP pendaftar'
const COL_TIPE_A    = 'Nama Peng-Qurban TIPE A (Rp3,5 Juta per 1/7 sapi)'
const COL_TIPE_B    = 'Nama Peng-Qurban TIPE B (Penitipan Sapi)'
const COL_TIPE_C    = 'Nama Peng-Qurban TIPE C (Penitipan Kambing)'

// ─── Parser: Google Forms export ──────────────────────────────────────────
function parseGForms(rows: Record<string, any>[]): ParseResult {
  const errors: string[] = []
  let skippedRows = 0
  const kelompokList: ImportedKelompok[] = []

  // SAPI-A: di-group berdasarkan (pendaftar_nama + no_hp)
  const sapiAMap   = new Map<string, ImportedKelompok>()
  const sapiAOrder : string[] = []

  rows.forEach((row, i) => {
    const rowNum = i + 2 // +2 karena baris header = baris 1

    const pendaftarNama = String(row[COL_PENDAFTAR] ?? '').trim()
    const alamat        = String(row[COL_ALAMAT]    ?? '').trim()
    const noHp          = String(row[COL_HP]         ?? '').trim()
    const rawA          = String(row[COL_TIPE_A]     ?? '').trim()
    const rawB          = String(row[COL_TIPE_B]     ?? '').trim()
    const rawC          = String(row[COL_TIPE_C]     ?? '').trim()

    const isEmpty = (v: string) => !v || v === '.' || v === '-' || v.length < 2

    const hasA = !isEmpty(rawA)
    const hasB = !isEmpty(rawB)
    const hasC = !isEmpty(rawC)

    if (!hasA && !hasB && !hasC) { skippedRows++; return }

    // ── TIPE A ───────────────────────────────────────────────────────────
    if (hasA) {
      const namaA = cleanNama(rawA)
      if (!namaA) { skippedRows++; return }

      // Kunci grouping: norm(pendaftar) + '|' + norm(hp)
      // Jika keduanya kosong, pakai row index agar tidak di-merge
      const keyRaw = norm(pendaftarNama) + '|' + norm(noHp)
      const key    = keyRaw === '|' ? `__row_${rowNum}` : keyRaw

      if (!sapiAMap.has(key)) {
        sapiAMap.set(key, {
          tipe: 'SAPI-A',
          pendaftarNama,
          pendaftarHp: noHp,
          pendaftarAlamat: alamat,
          jamaahList: [],
        })
        sapiAOrder.push(key)
      }

      const grup = sapiAMap.get(key)!
      if (grup.jamaahList.length >= 7) {
        errors.push(
          `Baris ${rowNum}: "${namaA}" melebihi batas 7 orang untuk kelompok "${pendaftarNama || noHp}" — dilewati`
        )
      } else {
        grup.jamaahList.push({
          nama_lengkap:   namaA,
          no_hp:          noHp   || undefined,
          alamat_lengkap: alamat || undefined,
        })
      }
    }

    // ── TIPE B ───────────────────────────────────────────────────────────
    if (hasB) {
      const names = splitMultilineNama(rawB)
      if (names.length === 0) { skippedRows++; return }

      if (names.length > 7) {
        errors.push(
          `Baris ${rowNum}: SAPI-B "${pendaftarNama}" memiliki ${names.length} orang — hanya 7 pertama yang diimport`
        )
      }

      kelompokList.push({
        tipe: 'SAPI-B',
        pendaftarNama,
        pendaftarHp: noHp,
        pendaftarAlamat: alamat,
        jamaahList: names.slice(0, 7).map((n) => ({
          nama_lengkap:   n,
          no_hp:          noHp   || undefined,
          alamat_lengkap: alamat || undefined,
        })),
      })
    }

    // ── TIPE C (Kambing) ─────────────────────────────────────────────────
    if (hasC) {
      const namaC = cleanNama(rawC)
      if (!namaC) { skippedRows++; return }

      kelompokList.push({
        tipe: 'KAMBING',
        pendaftarNama,
        pendaftarHp: noHp,
        pendaftarAlamat: alamat,
        jamaahList: [{
          nama_lengkap:   namaC,
          no_hp:          noHp   || undefined,
          alamat_lengkap: alamat || undefined,
        }],
      })
    }
  })

  // Tambahkan SAPI-A groups (urutan insertion) ke depan list
  for (const key of sapiAOrder) {
    kelompokList.unshift(sapiAMap.get(key)!)
  }

  // Urutkan: SAPI-A → SAPI-B → KAMBING
  kelompokList.sort((a, b) => {
    const order: Record<ImportTipe, number> = { 'SAPI-A': 0, 'SAPI-B': 1, 'KAMBING': 2 }
    return order[a.tipe] - order[b.tipe]
  })

  return { kelompokList, errors, skippedRows, format: 'gforms' }
}

// ─── Parser: Template sederhana ───────────────────────────────────────────
function parseSimple(rows: Record<string, any>[]): ParseResult {
  const errors: string[] = []
  let skippedRows = 0
  const kelompokList: ImportedKelompok[] = []

  const sapiAMap   = new Map<string, ImportedKelompok>()
  const sapiAOrder : string[] = []

  rows.forEach((row, i) => {
    const rowNum = i + 2

    // Coba berbagai variasi nama kolom
    const tipeRaw    = String(row['Tipe'] ?? row['tipe'] ?? row['TIPE'] ?? '').trim().toUpperCase()
    const namaRaw    = String(row['Nama Peng-Qurban'] ?? row['Nama'] ?? row['nama'] ?? '').trim()
    const hp         = String(row['No HP'] ?? row['No. HP'] ?? row['HP'] ?? row['Nomor HP'] ?? '').trim()
    const alamat     = String(row['Alamat'] ?? row['Alamat Lengkap'] ?? '').trim()
    const pendaftar  = String(row['Nama Pendaftar'] ?? '').trim()

    if (!tipeRaw || !namaRaw) { skippedRows++; return }

    // Normalisasi nilai kolom Tipe
    const tipe: ImportTipe | null =
      ['SAPI-A', 'SAPI A', 'A'].includes(tipeRaw) ? 'SAPI-A' :
      ['SAPI-B', 'SAPI B', 'B'].includes(tipeRaw) ? 'SAPI-B' :
      ['KAMBING', 'KMB', 'C'].includes(tipeRaw)   ? 'KAMBING' : null

    if (!tipe) {
      errors.push(`Baris ${rowNum}: Tipe "${tipeRaw}" tidak dikenali (gunakan SAPI-A, SAPI-B, atau KAMBING)`)
      skippedRows++
      return
    }

    if (tipe === 'SAPI-A') {
      const nama = cleanNama(namaRaw)
      if (!nama) { skippedRows++; return }

      // Grouping: prioritaskan kolom Nama Pendaftar, fallback ke No HP
      const groupVal  = norm(pendaftar || hp)
      const groupKey  = groupVal || `__row_${rowNum}`

      if (!sapiAMap.has(groupKey)) {
        sapiAMap.set(groupKey, {
          tipe: 'SAPI-A',
          pendaftarNama:  pendaftar || nama,
          pendaftarHp:    hp,
          pendaftarAlamat: alamat,
          jamaahList: [],
        })
        sapiAOrder.push(groupKey)
      }

      const grup = sapiAMap.get(groupKey)!
      if (grup.jamaahList.length >= 7) {
        errors.push(`Baris ${rowNum}: "${nama}" melebihi 7 orang di kelompok — dilewati`)
      } else {
        grup.jamaahList.push({
          nama_lengkap:   nama,
          no_hp:          hp     || undefined,
          alamat_lengkap: alamat || undefined,
        })
      }

    } else if (tipe === 'SAPI-B') {
      const names = splitMultilineNama(namaRaw)
      if (names.length === 0) { skippedRows++; return }
      if (names.length > 7) {
        errors.push(`Baris ${rowNum}: SAPI-B "${pendaftar}" memiliki ${names.length} orang — hanya 7 pertama`)
      }
      kelompokList.push({
        tipe: 'SAPI-B',
        pendaftarNama:  pendaftar,
        pendaftarHp:    hp,
        pendaftarAlamat: alamat,
        jamaahList: names.slice(0, 7).map((n) => ({
          nama_lengkap:   n,
          no_hp:          hp     || undefined,
          alamat_lengkap: alamat || undefined,
        })),
      })

    } else {
      // KAMBING
      const nama = cleanNama(namaRaw)
      if (!nama) { skippedRows++; return }
      kelompokList.push({
        tipe: 'KAMBING',
        pendaftarNama:  pendaftar || nama,
        pendaftarHp:    hp,
        pendaftarAlamat: alamat,
        jamaahList: [{ nama_lengkap: nama, no_hp: hp || undefined, alamat_lengkap: alamat || undefined }],
      })
    }
  })

  for (const key of sapiAOrder) kelompokList.unshift(sapiAMap.get(key)!)

  kelompokList.sort((a, b) => {
    const order: Record<ImportTipe, number> = { 'SAPI-A': 0, 'SAPI-B': 1, 'KAMBING': 2 }
    return order[a.tipe] - order[b.tipe]
  })

  return { kelompokList, errors, skippedRows, format: 'simple' }
}

// ─── Entry point utama ────────────────────────────────────────────────────
export function detectAndParse(rows: Record<string, any>[]): ParseResult {
  if (!rows || rows.length === 0) {
    return {
      kelompokList: [],
      errors: ['File kosong atau tidak ada baris data.'],
      skippedRows: 0,
      format: 'unknown',
    }
  }

  const keys = Object.keys(rows[0] ?? {})

  // Deteksi format Google Forms
  if (keys.some((k) => k.includes('Nama Peng-Qurban TIPE'))) {
    return parseGForms(rows)
  }

  // Deteksi format template sederhana
  if (keys.some((k) => ['tipe', 'Tipe', 'TIPE'].includes(k))) {
    return parseSimple(rows)
  }

  return {
    kelompokList: [],
    errors: [
      'Format file tidak dikenali. Gunakan template yang tersedia atau export langsung dari Google Forms.',
    ],
    skippedRows: rows.length,
    format: 'unknown',
  }
}
