'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { STATUS_CONFIG, STATUS_ORDER } from '@/types'
import type { StatusHewan, JenisHewan } from '@/types'

interface TrackingData {
  kode_resi: string
  jenis_hewan: JenisHewan
  status: StatusHewan
  url_dokumentasi: string | null
  nama_workspace: string
  jamaah: Array<{ id: string; nama_lengkap: string; atas_nama: string | null }>
}

export default function TrackingPage() {
  const searchParams = useSearchParams()
  const [kode, setKode] = useState(searchParams.get('kode') ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackingData | null>(null)
  const [error, setError] = useState('')

  const handleSearch = useCallback(async (searchKode?: string) => {
    const q = (searchKode ?? kode).trim().toUpperCase()
    if (!q) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`/api/tracking?kode=${encodeURIComponent(q)}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Terjadi kesalahan. Coba lagi.')
      } else {
        setResult(json.data)
      }
    } catch {
      setError('Koneksi gagal. Periksa internet Anda.')
    } finally {
      setLoading(false)
    }
  }, [kode])

  // Auto-search jika ada kode dari URL param (misal dari link WA)
  useEffect(() => {
    const paramKode = searchParams.get('kode')
    if (paramKode) {
      setKode(paramKode)
      handleSearch(paramKode)
    }
  }, []) // eslint-disable-line

  const currentStep = result ? STATUS_CONFIG[result.status].step : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🌙</span>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">Portal Tracking Qurban</h1>
            <p className="text-xs text-gray-400 mt-0.5">Cek status hewan qurban Anda</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* Search Box */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Masukkan Kode Resi Qurban Anda
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Contoh: X7KQ-2M9R"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition uppercase"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !kode.trim()}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium rounded-xl transition text-sm whitespace-nowrap"
            >
              {loading ? '...' : 'Cek'}
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Hasil */}
        {result && (
          <div className="space-y-4">

            {/* Info Hewan */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Kode Hewan</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono mt-0.5">{result.kode_resi}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {result.jenis_hewan === 'SAPI' ? '🐄 Sapi' : '🐐 Kambing'} • {result.nama_workspace}
                  </p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[result.status].bgColor} ${STATUS_CONFIG[result.status].color}`}>
                  {STATUS_CONFIG[result.status].labelShort}
                </span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-5">Status Penyembelihan</h3>
              <div className="space-y-0">
                {STATUS_ORDER.map((status, idx) => {
                  const config = STATUS_CONFIG[status]
                  const isCompleted = currentStep > config.step
                  const isActive = currentStep === config.step
                  const isLast = idx === STATUS_ORDER.length - 1

                  return (
                    <div key={status} className="flex gap-4">
                      {/* Line + Dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0 transition-all
                          ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                          ${isActive ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' : ''}
                          ${!isCompleted && !isActive ? 'bg-white border-gray-200 text-gray-300' : ''}
                        `}>
                          {isCompleted ? '✓' : config.step}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 flex-1 my-1 min-h-[24px] transition-all
                            ${isCompleted ? 'bg-emerald-400' : 'bg-gray-100'}
                          `} />
                        )}
                      </div>

                      {/* Label */}
                      <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                        <p className={`text-sm font-semibold leading-none mb-1
                          ${isActive ? 'text-emerald-700' : ''}
                          ${isCompleted ? 'text-gray-500' : ''}
                          ${!isCompleted && !isActive ? 'text-gray-300' : ''}
                        `}>
                          {config.label}
                        </p>
                        {isActive && (
                          <p className="text-xs text-emerald-500 font-medium">● Sedang berlangsung</p>
                        )}
                        {isCompleted && (
                          <p className="text-xs text-gray-400">Selesai</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Daftar Jamaah */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Daftar Pengqurban ({result.jamaah.length} orang)
              </h3>
              <div className="space-y-2">
                {result.jamaah.map((j, idx) => (
                  <div key={j.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{j.nama_lengkap}</p>
                      {j.atas_nama && (
                        <p className="text-xs text-gray-400">({j.atas_nama})</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Dokumentasi */}
            {result.url_dokumentasi && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">📹 Dokumentasi Penyembelihan</h3>
                <div className="rounded-xl overflow-hidden bg-gray-100 aspect-video">
                  <iframe
                    src={result.url_dokumentasi}
                    className="w-full h-full"
                    allow="autoplay"
                    title="Dokumentasi Penyembelihan"
                  />
                </div>
              </div>
            )}

            {/* Auto refresh info */}
            <p className="text-center text-xs text-gray-400">
              Halaman ini otomatis diperbarui setiap 30 detik
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
