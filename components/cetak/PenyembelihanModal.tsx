'use client'

import { useState, useCallback } from 'react'
import { X, Printer, Download } from 'lucide-react'
import type { Hewan, Jamaah } from '@/types'

interface KelompokData {
  hewan: Hewan
  jamaah: Jamaah[]
}

interface Props {
  data: KelompokData[]
  onClose: () => void
}

export default function PenyembelihanModal({ data, onClose }: Props) {
  const [namaPerLembar, setNamaPerLembar] = useState(7)

  const buildPrintHTML = useCallback(() => {
    const cards = data.map(({ hewan, jamaah }) => {
      const rows = jamaah.slice(0, namaPerLembar).map((j, i) => `
        <tr>
          <td style="border:2px solid black;padding:6px 10px;font-size:14px;font-weight:bold;width:40px;text-align:center">${i + 1}</td>
          <td style="border:2px solid black;padding:6px 10px;font-size:14px;font-weight:bold">${j.nama_lengkap.toUpperCase()}</td>
        </tr>`).join('')

      return `
        <div style="page-break-after:always;padding:15mm;box-sizing:border-box;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="border:3px solid black;width:100%;max-width:160mm">
            <div style="background:black;color:white;text-align:center;padding:10px">
              <p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:0;font-family:monospace">${hewan.kode_resi}</p>
              <p style="font-size:12px;margin:2px 0 0;opacity:0.8">${hewan.jenis_hewan}</p>
            </div>
            <table style="border-collapse:collapse;width:100%">
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`
    }).join('')

    return `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <style>
        @page { margin: 0 }
        body { margin: 0; font-family: Arial, sans-serif }
      </style>
    </head><body>${cards}</body></html>`
  }, [data, namaPerLembar])

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildPrintHTML())
    win.document.close()
    win.onload = () => win.print()
  }

  function handleDownload() {
    const blob = new Blob([buildPrintHTML()], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kertas-penyembelihan.html'
    a.click()
  }

  // Preview — tampilkan 1-2 kelompok saja
  const previewData = data.slice(0, 2)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">Cetak Kertas Penyembelihan</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"><X size={16} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Settings */}
          <div className="w-56 flex-shrink-0 border-r border-gray-100 p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pengaturan</p>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Nama per lembar</label>
                <select
                  value={namaPerLembar}
                  onChange={(e) => setNamaPerLembar(+e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>{n} nama {n === 7 ? '(Sapi)' : n === 1 ? '(Kambing)' : ''}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-2">
                  Kambing = 1, Sapi = 7
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400">{data.length} lembar akan dicetak</p>
              <p className="text-xs text-gray-400 mt-1">Preview menampilkan {previewData.length} lembar pertama</p>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-gray-200 p-6">
            <p className="text-xs text-gray-500 mb-4 text-center">Preview (2 lembar pertama)</p>
            <div className="space-y-6">
              {previewData.map(({ hewan, jamaah }) => (
                <div key={hewan.id} className="bg-white shadow-md rounded-lg overflow-hidden max-w-sm mx-auto border-2 border-black">
                  {/* Header hitam */}
                  <div className="bg-black text-white text-center py-3 px-4">
                    <p className="font-bold text-2xl tracking-widest font-mono">{hewan.kode_resi}</p>
                    <p className="text-xs opacity-70 mt-0.5">{hewan.jenis_hewan}</p>
                  </div>
                  {/* Tabel nama */}
                  <table className="w-full border-collapse">
                    <tbody>
                      {jamaah.slice(0, namaPerLembar).map((j, i) => (
                        <tr key={j.id}>
                          <td className="border-2 border-black px-3 py-2 font-bold text-center w-10">{i + 1}</td>
                          <td className="border-2 border-black px-3 py-2 font-bold text-sm uppercase">{j.nama_lengkap}</td>
                        </tr>
                      ))}
                      {/* Baris kosong jika kurang dari namaPerLembar */}
                      {Array.from({ length: Math.max(0, namaPerLembar - jamaah.length) }).map((_, i) => (
                        <tr key={`empty-${i}`}>
                          <td className="border-2 border-black px-3 py-2 font-bold text-center w-10 text-gray-300">{jamaah.length + i + 1}</td>
                          <td className="border-2 border-black px-3 py-2 text-gray-200">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={15} /> Download
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-medium text-white">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>
    </div>
  )
}
