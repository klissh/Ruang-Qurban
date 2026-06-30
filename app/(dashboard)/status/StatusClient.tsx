'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { STATUS_CONFIG, STATUS_ORDER } from '@/types'
import type { StatusHewan, JenisHewan } from '@/types'
import { isValidGDriveUrl, convertGDriveToPreview } from '@/lib/utils'

interface HewanItem {
  id: string
  kode_resi: string
  jenis_hewan: JenisHewan
  status: StatusHewan
  url_dokumentasi: string | null
}

interface ModalState {
  hewan: HewanItem
  statusBaru: StatusHewan
  urlDok: string
}

export default function StatusClient({ hewanList }: { hewanList: HewanItem[] }) {
  const [list, setList] = useState<HewanItem[]>(hewanList)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'SEMUA' | JenisHewan | StatusHewan>('SEMUA')

  const stats = {
    total: list.length,
    belum: list.filter((h) => h.status === 'BELUM_DISEMBELIH').length,
    proses: list.filter((h) => h.status === 'SEDANG_DISEMBELIH' || h.status === 'PENCACAHAN').length,
    selesai: list.filter((h) => h.status === 'SELESAI').length,
  }

  const filtered = list.filter((h) => {
    if (filter === 'SEMUA') return true
    if (filter === 'SAPI' || filter === 'KAMBING') return h.jenis_hewan === filter
    return h.status === filter
  })

  function openModal(hewan: HewanItem) {
    setModal({ hewan, statusBaru: hewan.status, urlDok: hewan.url_dokumentasi ?? '' })
  }

  async function handleSimpan() {
    if (!modal) return
    if (modal.urlDok && !isValidGDriveUrl(modal.urlDok)) {
      toast.error('Link Google Drive tidak valid')
      return
    }

    const previewUrl = modal.urlDok ? convertGDriveToPreview(modal.urlDok) : undefined
    setLoading(true)

    try {
      const res = await fetch('/api/hewan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_hewan: modal.hewan.id,
          status_baru: modal.statusBaru,
          url_dokumentasi: previewUrl,
        }),
      })
      if (!res.ok) throw new Error()

      setList((prev) =>
        prev.map((h) =>
          h.id === modal.hewan.id
            ? { ...h, status: modal.statusBaru, url_dokumentasi: previewUrl ?? h.url_dokumentasi }
            : h
        )
      )
      toast.success(`${modal.hewan.kode_resi} → ${STATUS_CONFIG[modal.statusBaru].label}`)
      setModal(null)
    } catch {
      toast.error('Gagal memperbarui status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* Header sticky */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="px-4 pt-4 pb-2">
          <h1 className="font-bold text-gray-900 text-xl">Status Hewan</h1>
          <div className="flex gap-3 mt-1 text-sm">
            <span className="text-gray-400">Total <strong className="text-gray-700">{stats.total}</strong></span>
            <span className="text-gray-400">Proses <strong className="text-amber-600">{stats.proses}</strong></span>
            <span className="text-gray-400">Selesai <strong className="text-emerald-600">{stats.selesai}</strong></span>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {[
            { key: 'SEMUA', label: 'Semua' },
            { key: 'SAPI', label: '🐄 Sapi' },
            { key: 'KAMBING', label: '🐐 Kambing' },
            { key: 'BELUM_DISEMBELIH', label: 'Persiapan' },
            { key: 'SEDANG_DISEMBELIH', label: 'Disembelih' },
            { key: 'PENCACAHAN', label: 'Pencacahan' },
            { key: 'SELESAI', label: 'Selesai' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition
                ${filter === key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid kartu hewan */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((hewan) => {
          const config = STATUS_CONFIG[hewan.status]
          const isSelesai = hewan.status === 'SELESAI'

          return (
            <button
              key={hewan.id}
              onClick={() => openModal(hewan)}
              className={`rounded-2xl p-4 text-left border-2 transition-all active:scale-95 shadow-sm
                ${isSelesai
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-gray-100 hover:border-emerald-300 hover:shadow-md'}`}
            >
              <p className="font-bold text-gray-900 text-base font-mono leading-tight">{hewan.kode_resi}</p>
              <p className="text-xs text-gray-400 mt-1">{hewan.jenis_hewan === 'SAPI' ? '🐄' : '🐐'} {hewan.jenis_hewan}</p>
              <div className={`mt-2.5 inline-flex px-2 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.color}`}>
                {isSelesai && '✓ '}{config.labelShort}
              </div>
              {hewan.url_dokumentasi && (
                <p className="text-xs text-emerald-500 mt-1.5">📹 Ada dokumentasi</p>
              )}
            </button>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-2 py-16 text-center text-gray-400 text-sm">
            Tidak ada hewan dengan filter ini
          </div>
        )}
      </div>

      {/* Modal Update Status */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 pt-3 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-xl font-mono">{modal.hewan.kode_resi}</p>
                  <p className="text-sm text-gray-400">{modal.hewan.jenis_hewan === 'SAPI' ? '🐄 Sapi' : '🐐 Kambing'}</p>
                </div>
                <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg">×</button>
              </div>
            </div>

            <div className="px-6 pb-2">
              <p className="text-sm font-semibold text-gray-700 mb-3">Ubah Status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_ORDER.map((status) => {
                  const config = STATUS_CONFIG[status]
                  const isSelected = modal.statusBaru === status
                  const isCurrent = modal.hewan.status === status
                  return (
                    <button
                      key={status}
                      onClick={() => setModal((m) => m ? { ...m, statusBaru: status } : m)}
                      className={`px-3 py-3 rounded-xl border-2 text-left text-sm font-medium transition
                        ${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'}`}
                    >
                      <span className={`block text-xs mb-0.5 ${config.color}`}>{config.labelShort}</span>
                      {isCurrent && <span className="text-xs text-gray-400 font-normal">Status sekarang</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Link Dokumentasi */}
            <div className="px-6 pb-4 mt-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Link Dokumentasi Google Drive
                <span className="text-gray-400 font-normal ml-1 text-xs">(opsional)</span>
              </p>
              <input
                type="url"
                value={modal.urlDok}
                onChange={(e) => setModal((m) => m ? { ...m, urlDok: e.target.value } : m)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {modal.urlDok && !isValidGDriveUrl(modal.urlDok) && (
                <p className="text-xs text-red-500 mt-1">Format link tidak valid</p>
              )}
            </div>

            <div className="px-6 pb-8 flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSimpan}
                disabled={loading || modal.statusBaru === modal.hewan.status && !modal.urlDok}
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold text-sm transition"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
