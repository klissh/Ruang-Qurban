// ============================================================
// Fonnte WhatsApp API Integration
// ============================================================

const FONNTE_API_URL = 'https://api.fonnte.com/send'

interface SendMessageParams {
  target: string    // nomor HP tujuan (format: 628xxx)
  message: string
  delay?: number    // delay antar pesan dalam detik (hindari spam)
}

function formatPhoneNumber(noHp: string): string {
  // Normalisasi nomor HP ke format internasional Indonesia
  const cleaned = noHp.replace(/\D/g, '')
  if (cleaned.startsWith('0')) return '62' + cleaned.slice(1)
  if (cleaned.startsWith('62')) return cleaned
  return '62' + cleaned
}

export async function sendWhatsApp({ target, message, delay = 2 }: SendMessageParams) {
  const token = process.env.FONNTE_TOKEN
  if (!token) {
    console.warn('[Fonnte] FONNTE_TOKEN tidak ditemukan, skip notifikasi')
    return { success: false, reason: 'no_token' }
  }

  const formattedTarget = formatPhoneNumber(target)

  try {
    const res = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        target: formattedTarget,
        message,
        delay: String(delay),
      }),
    })

    const data = await res.json()
    return { success: data.status === true, data }
  } catch (err) {
    console.error('[Fonnte] Gagal kirim pesan:', err)
    return { success: false, reason: 'network_error' }
  }
}

// ============================================================
// Template Pesan Notifikasi
// ============================================================

export function buildPesanDisembelih(params: {
  namaJamaah: string
  kodeResi: string
  namaWorkspace: string
  kodePublik: string
  baseUrl: string
}): string {
  return `Assalamu'alaikum Warahmatullahi Wabarakatuh 🌙

Yth. Bapak/Ibu *${params.namaJamaah}*,

Kami dari *${params.namaWorkspace}* mengucapkan Selamat Hari Raya Idul Adha.

Hewan qurban Anda (${params.kodeResi}) saat ini *sedang dalam proses penyembelihan*.

Pantau status langsung di:
${params.baseUrl}/tracking?kode=${params.kodePublik}

Semoga ibadah qurban Anda diterima oleh Allah SWT. 🤲`
}

export function buildPesanSelesai(params: {
  namaJamaah: string
  kodeResi: string
  namaWorkspace: string
  kodePublik: string
  baseUrl: string
}): string {
  return `Assalamu'alaikum Warahmatullahi Wabarakatuh 🌙

Yth. Bapak/Ibu *${params.namaJamaah}*,

Alhamdulillah, hewan qurban Anda (${params.kodeResi}) telah *selesai disembelih dan dikemas* ✅

Anda dapat menyaksikan dokumentasi penyembelihan di:
${params.baseUrl}/tracking?kode=${params.kodePublik}

Jazakumullah khairan atas kepercayaan Anda.
Panitia Qurban *${params.namaWorkspace}* 🙏`
}

// ============================================================
// Kirim notifikasi ke semua jamaah dalam satu hewan
// ============================================================

export async function notifikasiJamaahHewan(params: {
  jamaahList: Array<{ nama_lengkap: string; no_hp: string | null }>
  kodeResi: string
  kodePublik: string
  status: 'SEDANG_DISEMBELIH' | 'SELESAI'
  namaWorkspace: string
  baseUrl: string
}) {
  const { jamaahList, kodeResi, kodePublik, status, namaWorkspace, baseUrl } = params

  const results: Array<{ jamaah: string; success: boolean; [key: string]: unknown }> = []

  for (const jamaah of jamaahList) {
    if (!jamaah.no_hp) continue

    const message = status === 'SEDANG_DISEMBELIH'
      ? buildPesanDisembelih({ namaJamaah: jamaah.nama_lengkap, kodeResi, namaWorkspace, kodePublik, baseUrl })
      : buildPesanSelesai({ namaJamaah: jamaah.nama_lengkap, kodeResi, namaWorkspace, kodePublik, baseUrl })

    const result = await sendWhatsApp({
      target: jamaah.no_hp,
      message,
      delay: 3, // 3 detik jeda antar pesan
    })

    results.push({ jamaah: jamaah.nama_lengkap, ...result })
  }

  return results
}
