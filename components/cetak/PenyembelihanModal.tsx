'use client'

import { useState } from 'react'
import { X, Printer, Download, ArrowLeft } from 'lucide-react'
import type { Hewan, Jamaah } from '@/types'

interface KelompokData { hewan: Hewan; jamaah: Jamaah[] }
interface Props { data: KelompokData[]; onClose: () => void; onBack?: () => void }

const MM_TO_PX = 3.7795

const PAPER_SIZES = {
  A4:     { w: 210,   h: 297,   label: 'A4 (210 × 297 mm)'     },
  F4:     { w: 215.9, h: 330.2, label: 'F4 (216 × 330 mm)'     },
  Letter: { w: 215.9, h: 279.4, label: 'Letter (216 × 279 mm)' },
} as const
type PaperKey = keyof typeof PAPER_SIZES

export default function PenyembelihanModal({ data, onClose, onBack }: Props) {
  const [namaPerLembar, setNamaPerLembar] = useState(7)
  const [paperKey, setPaperKey] = useState<PaperKey>('A4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [isGenerating, setIsGenerating] = useState(false)

  const paperW = orientation === 'portrait' ? PAPER_SIZES[paperKey].w : PAPER_SIZES[paperKey].h
  const paperH = orientation === 'portrait' ? PAPER_SIZES[paperKey].h : PAPER_SIZES[paperKey].w
  const paperWpx = paperW * MM_TO_PX
  const paperHpx = paperH * MM_TO_PX

  // Preview shows first animal on a single paper
  const previewAnimal = data[0]
  const MAX_W = 520, MAX_H = 680
  const previewScale = Math.min(MAX_W / paperWpx, MAX_H / paperHpx, 1)
  const [zoomFactor, setZoomFactor] = useState(1.0)
  const effectiveScale = previewScale * zoomFactor

  // Dimensions for the card on paper (mm)
  const marginMm = 15
  const contentW = paperW - 2 * marginMm
  const headerH = 22   // mm
  const rowH = 11      // mm per name row
  const cardH = headerH + namaPerLembar * rowH

  function buildPrintHTML() {
    const cards = data.map(({ hewan, jamaah }) => {
      const rows = jamaah.slice(0, namaPerLembar).map((j, i) => `
        <tr>
          <td style="border:2px solid black;padding:5px 8px;font-size:13px;font-weight:bold;width:36px;text-align:center">${i + 1}</td>
          <td style="border:2px solid black;padding:5px 8px;font-size:13px;font-weight:bold">${j.nama_lengkap.toUpperCase()}</td>
        </tr>`).join('')
      return `<div style="page-break-after:always;width:${paperW}mm;height:${paperH}mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:${marginMm}mm">
        <div style="border:3px solid black;width:100%">
          <div style="background:black;color:white;text-align:center;padding:8px 12px">
            <p style="font-size:30px;font-weight:bold;letter-spacing:5px;margin:0;font-family:monospace">${hewan.kode_resi}</p>
            <p style="font-size:11px;margin:3px 0 0;opacity:.75">${hewan.jenis_hewan}</p>
          </div>
          <table style="border-collapse:collapse;width:100%"><tbody>${rows}</tbody></table>
        </div>
      </div>`
    }).join('')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:${paperW}mm ${paperH}mm;margin:0} body{margin:0;font-family:Arial,sans-serif}
    </style></head><body>${cards}</body></html>`
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildPrintHTML())
    win.document.close()
    win.onload = () => win.print()
  }

  async function handleDownloadPDF() {
    setIsGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const fmt = paperKey === 'A4' ? 'a4' : paperKey === 'Letter' ? 'letter' : [PAPER_SIZES[paperKey].w, PAPER_SIZES[paperKey].h] as [number,number]
      const pdf = new jsPDF({ orientation, unit: 'mm', format: fmt })

      const mx = marginMm
      const cw = contentW
      const startY = (paperH - cardH) / 2  // vertikal center

      data.forEach(({ hewan, jamaah }, idx) => {
        if (idx > 0) pdf.addPage()

        const cy = startY
        const boxW = cw

        // Black header
        pdf.setFillColor(0, 0, 0)
        pdf.rect(mx, cy, boxW, headerH, 'F')
        pdf.setFont('courier', 'bold')
        pdf.setFontSize(28)
        pdf.setTextColor(255, 255, 255)
        pdf.text(hewan.kode_resi, paperW / 2, cy + 13, { align: 'center', charSpace: 3 })
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.text(hewan.jenis_hewan, paperW / 2, cy + 19, { align: 'center' })

        // Name rows
        pdf.setTextColor(0, 0, 0)
        const names = jamaah.slice(0, namaPerLembar)
        names.forEach((j, i) => {
          const ry = cy + headerH + i * rowH
          pdf.setDrawColor(0); pdf.setLineWidth(0.5)
          pdf.rect(mx, ry, 14, rowH)
          pdf.rect(mx + 14, ry, boxW - 14, rowH)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
          pdf.text(String(i + 1), mx + 7, ry + rowH * 0.65, { align: 'center' })
          pdf.text(j.nama_lengkap.toUpperCase().slice(0, 32), mx + 16, ry + rowH * 0.65)
        })

        // Empty rows
        for (let i = names.length; i < namaPerLembar; i++) {
          const ry = cy + headerH + i * rowH
          pdf.setDrawColor(180); pdf.setLineWidth(0.3)
          pdf.rect(mx, ry, 14, rowH)
          pdf.rect(mx + 14, ry, boxW - 14, rowH)
        }
        pdf.setDrawColor(0)
      })

      pdf.save('kertas-penyembelihan.pdf')
    } finally { setIsGenerating(false) }
  }

  // Preview card component (renders at paper pixel size, scaled down by previewScale)
  const PreviewCard = ({ hewan, jamaah }: { hewan: Hewan; jamaah: Jamaah[] }) => {
    const headerHpx = headerH * MM_TO_PX
    const rowHpx = rowH * MM_TO_PX
    const cwPx = contentW * MM_TO_PX
    const names = jamaah.slice(0, namaPerLembar)
    return (
      <div style={{ position: 'absolute', top: `${marginMm * MM_TO_PX}px`, left: `${marginMm * MM_TO_PX}px`, right: `${marginMm * MM_TO_PX}px` }}>
        <div style={{ border: '3px solid black', width: '100%', marginTop: `${(paperHpx - 2*marginMm*MM_TO_PX - headerHpx - namaPerLembar*rowHpx)/2}px` }}>
          {/* Black header */}
          <div style={{ background: 'black', color: 'white', textAlign: 'center', padding: '6px 10px' }}>
            <p style={{ fontWeight: 700, fontSize: 28, letterSpacing: 5, margin: 0, fontFamily: 'monospace' }}>{hewan.kode_resi}</p>
            <p style={{ fontSize: 10, margin: '2px 0 0', opacity: 0.75 }}>{hewan.jenis_hewan}</p>
          </div>
          {/* Name rows */}
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {names.map((j, i) => (
                <tr key={j.id}>
                  <td style={{ border: '2px solid black', padding: '4px 6px', fontWeight: 700, fontSize: 13, textAlign: 'center', width: 36, color: '#111' }}>{i + 1}</td>
                  <td style={{ border: '2px solid black', padding: '4px 6px', fontWeight: 700, fontSize: 13, color: '#111' }}>{j.nama_lengkap.toUpperCase()}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, namaPerLembar - names.length) }).map((_, i) => (
                <tr key={`e${i}`}>
                  <td style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: 13, textAlign: 'center', color: '#ddd', width: 36 }}>{names.length + i + 1}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 6px', color: '#ddd' }}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onBack && <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><ArrowLeft size={16} /></button>}
            <h2 className="font-bold text-gray-900 text-lg">Cetak Kertas Penyembelihan</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><X size={16} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Settings */}
          <div className="w-64 flex-shrink-0 border-r border-gray-100 p-5 space-y-5 overflow-y-auto">

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kertas</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Ukuran</label>
                  <select value={paperKey} onChange={e => setPaperKey(e.target.value as PaperKey)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {(Object.keys(PAPER_SIZES) as PaperKey[]).map(k => (
                      <option key={k} value={k}>{PAPER_SIZES[k].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-2 block">Orientasi</label>
                  <div className="flex gap-2">
                    {(['portrait','landscape'] as const).map(o => (
                      <button key={o} onClick={() => setOrientation(o)}
                        className={`flex-1 py-2 text-xs rounded-lg border font-medium transition ${orientation === o ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {o === 'portrait' ? 'Potret' : 'Landscape'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pengaturan</p>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Nama per lembar</label>
                <select value={namaPerLembar} onChange={e => setNamaPerLembar(+e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {[1,2,3,4,5,6,7].map(n => (
                    <option key={n} value={n}>{n} nama {n === 7 ? '(Sapi)' : n === 1 ? '(Kambing)' : ''}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-2">Kambing = 1 • Sapi = 7</p>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-0.5 pt-1 border-t border-gray-100">
              <p><span className="font-medium text-gray-600">{data.length} lembar</span> akan dicetak</p>
              <p>{paperW.toFixed(0)} × {paperH.toFixed(0)} mm</p>
              <p className="text-gray-300">Preview: lembar pertama</p>
            </div>
          </div>

          {/* Preview — 1 lembar pertama */}
          <div className="flex-1 overflow-auto bg-gray-200 p-6">

            {/* Zoom controls */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">{`Preview lembar 1${data.length > 1 ? ` dari ${data.length}` : ''}`}</p>
              <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => setZoomFactor(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                  disabled={zoomFactor <= 0.25}
                  className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:text-gray-300 transition border-r border-gray-200"
                >−</button>
                <span className="px-3 py-1.5 text-xs font-medium text-gray-700 min-w-[52px] text-center select-none">
                  {Math.round(effectiveScale * 100)}%
                </span>
                <button
                  onClick={() => setZoomFactor(z => Math.min(4.0, +(z + 0.25).toFixed(2)))}
                  disabled={zoomFactor >= 4.0}
                  className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:text-gray-300 transition border-l border-gray-200"
                >+</button>
                <button
                  onClick={() => setZoomFactor(1.0)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 transition border-l border-gray-200"
                  title="Reset zoom"
                >Fit</button>
              </div>
            </div>
            <div className="flex justify-center">
              {previewAnimal ? (
                <div style={{ width: paperWpx * effectiveScale, height: paperHpx * effectiveScale, position: 'relative', flexShrink: 0 }}
                  className="shadow-2xl">
                  <div style={{
                    width: paperWpx, height: paperHpx,
                    position: 'absolute', top: 0, left: 0,
                    transform: `scale(${effectiveScale})`, transformOrigin: 'top left',
                    background: 'white', overflow: 'hidden',
                  }}>
                    <PreviewCard hewan={previewAnimal.hewan} jamaah={previewAnimal.jamaah} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Tidak ada data untuk dipreview</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleDownloadPDF} disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">
            <Download size={15} /> {isGenerating ? 'Membuat PDF...' : 'Download PDF'}
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-medium text-white transition">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>
    </div>
  )
}
