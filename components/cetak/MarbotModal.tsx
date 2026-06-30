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
  namaWorkspace: string
  onClose: () => void
}

export default function MarbotModal({ data, namaWorkspace, onClose }: Props) {
  const [tahun, setTahun] = useState(new Date().getFullYear().toString())
  const [judulAtas, setJudulAtas] = useState(namaWorkspace)

  const buildPrintHTML = useCallback(() => {
    // Split kelompok jadi 2 kolom
    const mid = Math.ceil(data.length / 2)
    const left = data.slice(0, mid)
    const right = data.slice(mid)

    function renderKelompok(k: KelompokData, idx: number) {
      const rows = k.jamaah.map((j, i) => `
        <tr>
          <td style="border:1px solid #999;padding:3px 6px;font-size:10px;width:30px;text-align:center">${i + 1}</td>
          <td style="border:1px solid #999;padding:3px 6px;font-size:10px">
            ${j.nama_lengkap}
            ${j.atas_nama ? `<br><span style="font-size:9px;color:#555">(${j.atas_nama})</span>` : ''}
          </td>
        </tr>`).join('')

      return `
        <div style="margin-bottom:14px;break-inside:avoid">
          <p style="font-weight:bold;font-size:10px;margin:0 0 4px 0">KELOMPOK ${idx + 1}</p>
          <table style="border-collapse:collapse;width:100%">
            <thead>
              <tr>
                <th style="border:1px solid #999;padding:3px 6px;font-size:10px;background:#f0f0f0;text-align:center">NO.</th>
                <th style="border:1px solid #999;padding:3px 6px;font-size:10px;background:#f0f0f0;text-align:left">NAMA</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
    }

    const leftHTML = left.map((k, i) => renderKelompok(k, i)).join('')
    const rightHTML = right.map((k, i) => renderKelompok(k, i + mid)).join('')

    return `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <style>
        @page { margin: 15mm }
        body { font-family: Arial, sans-serif; margin: 0 }
        .header { text-align:center; margin-bottom:16px; border-bottom:2px solid black; padding-bottom:10px }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start }
      </style>
    </head><body>
      <div class="header">
        <p style="font-size:14px;font-weight:bold;margin:0">DAFTAR NAMA PENGURBAN</p>
        <p style="font-size:11px;margin:4px 0 0 0">${judulAtas} — ${tahun} H</p>
      </div>
      <div class="grid">
        <div>${leftHTML}</div>
        <div>${rightHTML}</div>
      </div>
    </body></html>`
  }, [data, judulAtas, tahun])

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
    a.download = 'daftar-marbot.html'
    a.click()
  }

  // Preview (simplified version of the layout)
  const mid = Math.ceil(data.length / 2)
  const left = data.slice(0, mid)
  const right = data.slice(mid)

  const KelompokPreview = ({ k, idx }: { k: KelompokData; idx: number }) => (
    <div className="mb-3 break-inside-avoid">
      <p className="font-bold text-[10px] mb-1">KELOMPOK {idx + 1}</p>
      <table className="w-full border-collapse text-[9px]">
        <thead>
          <tr>
            <th className="border border-gray-400 px-1 py-0.5 bg-gray-100 text-center w-7">NO.</th>
            <th className="border border-gray-400 px-1 py-0.5 bg-gray-100 text-left">NAMA</th>
          </tr>
        </thead>
        <tbody>
          {k.jamaah.map((j, i) => (
            <tr key={j.id}>
              <td className="border border-gray-400 px-1 py-0.5 text-center">{i + 1}</td>
              <td className="border border-gray-400 px-1 py-0.5">
                <span>{j.nama_lengkap}</span>
                {j.atas_nama && <span className="block text-gray-400 text-[8px]">({j.atas_nama})</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">Cetak Daftar Marbot</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"><X size={16} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Settings */}
          <div className="w-56 flex-shrink-0 border-r border-gray-100 p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pengaturan</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Judul / Nama Masjid</label>
                  <input
                    value={judulAtas}
                    onChange={(e) => setJudulAtas(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Tahun Hijriah</label>
                  <input
                    value={tahun}
                    onChange={(e) => setTahun(e.target.value)}
                    placeholder="1446 H"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">{data.length} kelompok • {data.reduce((a, k) => a + k.jamaah.length, 0)} jamaah</p>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-gray-100 p-6">
            <p className="text-xs text-gray-400 mb-3 text-center">Preview</p>
            <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
              <div className="text-center mb-4 pb-3 border-b-2 border-black">
                <p className="font-bold text-sm">DAFTAR NAMA PENGURBAN</p>
                <p className="text-xs mt-0.5">{judulAtas} — {tahun} H</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>{left.map((k, i) => <KelompokPreview key={k.hewan.id} k={k} idx={i} />)}</div>
                <div>{right.map((k, i) => <KelompokPreview key={k.hewan.id} k={k} idx={i + mid} />)}</div>
              </div>
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
