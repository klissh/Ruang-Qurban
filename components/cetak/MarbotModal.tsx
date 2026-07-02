'use client'

import { useState } from 'react'
import { X, Printer, Download, ArrowLeft } from 'lucide-react'
import type { Hewan, Jamaah } from '@/types'

interface KelompokData { hewan: Hewan; jamaah: Jamaah[] }
interface Props { data: KelompokData[]; namaWorkspace: string; onClose: () => void; onBack?: () => void }

const MM_TO_PX = 3.7795

const PAPER_SIZES = {
  A4:     { w: 210,   h: 297,   label: 'A4 (210 × 297 mm)'      },
  F4:     { w: 215.9, h: 330.2, label: 'F4 (216 × 330 mm)'      },
  Letter: { w: 215.9, h: 279.4, label: 'Letter (216 × 279 mm)'  },
} as const
type PaperKey = keyof typeof PAPER_SIZES

export default function MarbotModal({ data, namaWorkspace, onClose, onBack }: Props) {
  const [tahun, setTahun] = useState(new Date().getFullYear().toString())
  const [judulAtas, setJudulAtas] = useState(namaWorkspace)
  const [paperKey, setPaperKey] = useState<PaperKey>('A4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [isGenerating, setIsGenerating] = useState(false)

  const paperW = orientation === 'portrait' ? PAPER_SIZES[paperKey].w : PAPER_SIZES[paperKey].h
  const paperH = orientation === 'portrait' ? PAPER_SIZES[paperKey].h : PAPER_SIZES[paperKey].w
  const paperWpx = paperW * MM_TO_PX
  const paperHpx = paperH * MM_TO_PX

  const marginMm = 15
  const MAX_W = 580, MAX_H = 700
  const previewScale = Math.min(MAX_W / paperWpx, MAX_H / paperHpx, 1)
  const [zoomFactor, setZoomFactor] = useState(1.0)
  const effectiveScale = previewScale * zoomFactor

  const mid = Math.ceil(data.length / 2)
  const left = data.slice(0, mid)
  const right = data.slice(mid)

  // Preview kelompok component — renders at actual paper pixel density
  const KelompokBlock = ({ k, idx }: { k: KelompokData; idx: number }) => {
    const rowHpx = 18  // px per row at paper scale
    return (
      <div style={{ marginBottom: 12, breakInside: 'avoid' }}>
        <p style={{ fontWeight: 700, fontSize: 9, marginBottom: 4, color: '#374151' }}>KELOMPOK {idx + 1}</p>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 8 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #9ca3af', padding: '2px 4px', background: '#f3f4f6', width: 22, textAlign: 'center', color: '#374151' }}>NO.</th>
              <th style={{ border: '1px solid #9ca3af', padding: '2px 4px', background: '#f3f4f6', textAlign: 'left', color: '#374151' }}>NAMA</th>
            </tr>
          </thead>
          <tbody>
            {k.jamaah.map((j, i) => (
              <tr key={j.id}>
                <td style={{ border: '1px solid #9ca3af', padding: '2px 4px', textAlign: 'center', color: '#1f2937' }}>{i + 1}</td>
                <td style={{ border: '1px solid #9ca3af', padding: '2px 4px', color: '#1f2937' }}>
                  {j.nama_lengkap}
                  {j.atas_nama && <span style={{ display: 'block', fontSize: 7, color: '#6b7280' }}>({j.atas_nama})</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function buildPrintHTML() {
    function renderKelompok(k: KelompokData, idx: number) {
      const rows = k.jamaah.map((j, i) => `
        <tr>
          <td style="border:1px solid #999;padding:3px 5px;font-size:9px;width:28px;text-align:center">${i + 1}</td>
          <td style="border:1px solid #999;padding:3px 5px;font-size:9px">
            ${j.nama_lengkap}${j.atas_nama ? `<br><span style="font-size:8px;color:#555">(${j.atas_nama})</span>` : ''}
          </td>
        </tr>`).join('')
      return `<div style="margin-bottom:12px;break-inside:avoid">
        <p style="font-weight:bold;font-size:9px;margin:0 0 3px">KELOMPOK ${idx + 1}</p>
        <table style="border-collapse:collapse;width:100%">
          <thead><tr>
            <th style="border:1px solid #999;padding:3px 5px;font-size:9px;background:#f0f0f0;text-align:center;width:28px">NO.</th>
            <th style="border:1px solid #999;padding:3px 5px;font-size:9px;background:#f0f0f0;text-align:left">NAMA</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
    }
    const midH = Math.ceil(data.length / 2)
    const leftH = data.slice(0, midH).map((k, i) => renderKelompok(k, i)).join('')
    const rightH = data.slice(midH).map((k, i) => renderKelompok(k, i + midH)).join('')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:${paperW}mm ${paperH}mm;margin:${marginMm}mm}
      body{font-family:Arial,sans-serif;margin:0}
      .header{text-align:center;margin-bottom:14px;border-bottom:2px solid black;padding-bottom:8px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
    </style></head><body>
      <div class="header">
        <p style="font-size:13px;font-weight:bold;margin:0">DAFTAR NAMA PENGURBAN</p>
        <p style="font-size:10px;margin:3px 0 0">${judulAtas} — ${tahun} H</p>
      </div>
      <div class="grid"><div>${leftH}</div><div>${rightH}</div></div>
    </body></html>`
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

      const mx = marginMm, my = marginMm
      const colGap = 10
      const colW = (paperW - 2 * mx - colGap) / 2
      const maxY = paperH - my
      const headerH = 18  // mm

      function drawPageHeader(pdf: InstanceType<typeof jsPDF>) {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(0)
        pdf.text('DAFTAR NAMA PENGURBAN', paperW / 2, my + 6, { align: 'center' })
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
        pdf.text(`${judulAtas} — ${tahun} H`, paperW / 2, my + 12, { align: 'center' })
        pdf.setLineWidth(0.5); pdf.line(mx, my + 15, paperW - mx, my + 15)
      }

      function groupHeight(k: KelompokData): number {
        return 4 + 5 + k.jamaah.length * 5 + 4  // label + header + rows + gap
      }

      function drawGroup(pdf: InstanceType<typeof jsPDF>, k: KelompokData, gIdx: number, x: number, y: number) {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(0)
        pdf.text(`KELOMPOK ${gIdx + 1}`, x, y + 3.5)
        let cy = y + 4
        // Table header
        pdf.setFillColor(240, 240, 240); pdf.rect(x, cy, 10, 5, 'F')
        pdf.rect(x + 10, cy, colW - 10, 5, 'F')
        pdf.setDrawColor(150); pdf.setLineWidth(0.2)
        pdf.rect(x, cy, 10, 5); pdf.rect(x + 10, cy, colW - 10, 5)
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7)
        pdf.text('NO.', x + 5, cy + 3.5, { align: 'center' })
        pdf.text('NAMA', x + 12, cy + 3.5)
        cy += 5
        // Rows
        pdf.setFont('helvetica', 'normal')
        k.jamaah.forEach((j, i) => {
          pdf.setDrawColor(150); pdf.rect(x, cy, 10, 5); pdf.rect(x + 10, cy, colW - 10, 5)
          pdf.setFontSize(7); pdf.setTextColor(0)
          pdf.text(String(i + 1), x + 5, cy + 3.5, { align: 'center' })
          const nm = (j.atas_nama ? `${j.nama_lengkap} (${j.atas_nama})` : j.nama_lengkap).slice(0, 35)
          pdf.text(nm, x + 12, cy + 3.5)
          cy += 5
        })
        pdf.setDrawColor(0)
      }

      // Layout: fill left col, then right col, paginate
      drawPageHeader(pdf)
      let isFirstPage = true
      let leftY = my + headerH, rightY = my + headerH
      let onLeft = true

      data.forEach((k, gIdx) => {
        const gh = groupHeight(k)
        if (onLeft) {
          if (leftY + gh > maxY) {
            if (rightY + gh > maxY) {
              pdf.addPage(); drawPageHeader(pdf)
              leftY = my + headerH; rightY = my + headerH; onLeft = true
            } else { onLeft = false }
          }
          if (onLeft) {
            drawGroup(pdf, k, gIdx, mx, leftY); leftY += gh
          } else {
            drawGroup(pdf, k, gIdx, mx + colW + colGap, rightY); rightY += gh
          }
        } else {
          if (rightY + gh > maxY) {
            pdf.addPage(); drawPageHeader(pdf)
            leftY = my + headerH; rightY = my + headerH; onLeft = true
            drawGroup(pdf, k, gIdx, mx, leftY); leftY += gh
          } else {
            drawGroup(pdf, k, gIdx, mx + colW + colGap, rightY); rightY += gh
          }
        }
      })

      pdf.save('daftar-nama.pdf')
    } finally { setIsGenerating(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onBack && <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><ArrowLeft size={16} /></button>}
            <h2 className="font-bold text-gray-900 text-lg">Cetak Daftar Nama</h2>
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
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Judul / Nama Masjid</label>
                  <input value={judulAtas} onChange={e => setJudulAtas(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Tahun Hijriah</label>
                  <input value={tahun} onChange={e => setTahun(e.target.value)} placeholder="1446 H"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-0.5 pt-1 border-t border-gray-100">
              <p>{data.length} kelompok • {data.reduce((a, k) => a + k.jamaah.length, 0)} jamaah</p>
              <p>{paperW.toFixed(0)} × {paperH.toFixed(0)} mm</p>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-gray-200 p-6">

            {/* Zoom controls */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">"Preview"</p>
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
              <div style={{ width: paperWpx * effectiveScale, height: paperHpx * effectiveScale, position: 'relative', flexShrink: 0 }}
                className="shadow-2xl">
                <div style={{
                  width: paperWpx, height: paperHpx,
                  position: 'absolute', top: 0, left: 0,
                  transform: `scale(${effectiveScale})`, transformOrigin: 'top left',
                  background: 'white', overflow: 'hidden',
                }}>
                  <div style={{ padding: `${marginMm * MM_TO_PX}px` }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: 8, marginBottom: 12 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, margin: 0, color: '#111' }}>DAFTAR NAMA PENGURBAN</p>
                      <p style={{ fontSize: 10, margin: '3px 0 0', color: '#374151' }}>{judulAtas} — {tahun} H</p>
                    </div>
                    {/* Two columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
                      <div>{left.map((k, i) => <KelompokBlock key={k.hewan.id} k={k} idx={i} />)}</div>
                      <div>{right.map((k, i) => <KelompokBlock key={k.hewan.id} k={k} idx={i + mid} />)}</div>
                    </div>
                  </div>
                </div>
              </div>
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
