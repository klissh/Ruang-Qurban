// ============================================================
// Utility Functions
// ============================================================

/**
 * Generate kode_resi berurutan berdasarkan jenis dan urutan
 * Sapi: SAPI-A01, SAPI-A02, ...
 * Kambing: KMB-001, KMB-002, ...
 */
export function generateKodeResi(jenis: 'SAPI' | 'KAMBING', index: number): string {
  if (jenis === 'SAPI') {
    // Format: SAPI-A01, SAPI-A02, ..., SAPI-A09, SAPI-B01, dst
    const group = String.fromCharCode(65 + Math.floor((index - 1) / 9)) // A, B, C, ...
    const num = String((index - 1) % 9 + 1).padStart(2, '0')
    return `SAPI-${group}${num}`
  } else {
    return `KMB-${String(index).padStart(3, '0')}`
  }
}

/**
 * Konversi link Google Drive share ke embed preview
 * Input:  https://drive.google.com/file/d/1aBcDeFg/view?usp=sharing
 * Output: https://drive.google.com/file/d/1aBcDeFg/preview
 */
export function convertGDriveToPreview(url: string): string | null {
  try {
    // Match file ID dari berbagai format URL Google Drive
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Format tanggal Indonesia
 */
export function formatTanggal(dateStr: string): string {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format tanggal pendek
 */
export function formatTanggalPendek(dateStr: string): string {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Hitung jumlah maks jamaah berdasarkan jenis hewan
 */
export function getMaxJamaah(jenis: 'SAPI' | 'KAMBING'): number {
  return jenis === 'SAPI' ? 7 : 1
}

/**
 * Validasi URL Google Drive
 */
export function isValidGDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') && (
    url.includes('/file/d/') || url.includes('?id=')
  )
}

/**
 * Truncate string dengan ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Convert mm ke points untuk PDF (1mm = 2.8346 pt)
 */
export function mmToPt(mm: number): number {
  return mm * 2.8346
}
