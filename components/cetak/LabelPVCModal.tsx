'use client'

import { useState } from 'react'
import { X, Printer, Download, ArrowLeft } from 'lucide-react'
import type { Jamaah, Hewan } from '@/types'

interface LabelData { hewan: Hewan; jamaah: Jamaah[] }
interface Config { lebarMm: number; tinggiMm: number; kolomPerBaris: number }
interface Props { data: LabelData[]; onClose: () => void; onBack?: () => void }

const DEFAULT_CONFIG: Config = { lebarMm: 85.6, tinggiMm: 53.98, kolomPerBaris: 2 }
const MM_TO_PX = 3.7795

const PAPER_SIZES = {
  A4:     { w: 210,   h: 297,   label: 'A4 (210 × 297 mm)'     },
  F4:     { w: 215.9, h: 330.2, label: 'F4 (216 × 330 mm)'     },
  Letter: { w: 215.9, h: 279.4, label: 'Letter (216 × 279 mm)' },
} as const
type PaperKey = keyof typeof PAPER_SIZES

function LabelCard({ hewan, jamaah, lw, lh }: { hewan: Hewan; jamaah: Jamaah[]; lw: number; lh: number }) {
  const wpx = lw * MM_TO_PX
  const hpx = lh * MM_TO_PX
  return (
    <div style={{ width: wpx, height: hpx, flexShrink: 0, boxSizing: 'border-box' }}
      className="border border-black bg-white flex flex-col overflow-hidden font-mono" style={{ padding: '2mm' } as React.CSSProperties}>
      <div className="font-bold text-[11px] leading-tight border-b border-black pb-[2px] mb-[2px] tracking-wide text-gray-900 truncate">
        {hewan.kode_resi}
      </div>
      {jamaah.map((j, idx) => (
        <div key={j.id} className="text-[8px] leading-[1.3] truncate text-gray-800">
          {jamaah.length > 1 ? `${idx + 1}. ` : ''}{j.nama_lengkap}
        </div>
      ))}
      <div className="mt-auto pt-[2px] border-t border-gray-300">
        <div className="text-[7px] leading-[1.3] text-gray-600 break-words whitespace-normal">{jamaah[0]?.alamat_lengkap ?? '—'}</div>
        {jamaah[0]?.no_hp && <div className="text-[7px] text-gray-500">{jamaah[0].no_hp}</div>}
      </div>
    </div>
  )
}

export default function LabelPVCModal({ data, onClose, onBack }: Props) {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [paperKey, setPaperKey] = useState<PaperKey>('A4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [isGenerating, setIsGenerating] = useState(false)

  const labels = data.map(({ hewan, jamaah }) => ({ hewan, jamaah }))

  const paperW = orientation === 'portrait' ? PAPER_SIZES[paperKey].w : PAPER_SIZES[paperKey].h
  const paperH = orientation === 'portrait' ? PAPER_SIZES[paperKey].h : PAPER_SIZES[paperKey].w
  const paperWpx = paperW * MM_TO_PX
  const paperHpx = paperH * MM_TO_PX

  const marginMm = 10, gapMm = 3
  const cols = config.kolomPerBaris
  const lw = config.lebarMm, lh = config.tinggiMm
  const usableW = paperW - 2 * marginMm
  const fitsInPaper = cols * lw + (cols - 1) * gapMm <= usableW
  const autoFitLw = Math.floor(((usableW - (cols - 1) * gapMm) / cols) * 10) / 10
  const rowsPerPage = Math.max(1, Math.floor((paperH - 2 * marginMm + gapMm) / (lh + gapMm)))
  const labelsPerPage = cols * rowsPerPage
  const totalPages = Math.ceil(Math.max(1, labels.length) / labelsPerPage)

  const MAX_W = 580, MAX_H = 680
  const previewScale = Math.min(MAX_W / paperWpx, MAX_H / paperHpx, 1)
  const [zoomFactor, setZoomFactor] = useState(1.0)
  const effectiveScale = previewScale * zoomFactor

  const firstPageLabels = labels.slice(0, labelsPerPage)

  function buildPrintHTML() {
    const labelHTMLs = labels.map(({ hewan, jamaah }) => {
      const names = jamaah.map((j, i) =>
        `<div style="font-size:8px;line-height:1.3;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${jamaah.length > 1 ? `${i + 1}. ` : ''}${j.nama_lengkap}</div>`
      ).join('')
      return `<div style="width:${lw}mm;height:${lh}mm;border:1px solid black;padding:2mm;box-sizing:border-box;font-family:monospace;display:flex;flex-direction:column;overflow:hidden;break-inside:avoid">
        <div style="font-weight:bold;font-size:11px;border-bottom:1px solid black;padding-bottom:2px;margin-bottom:2px;letter-spacing:.5px">${hewan.kode_resi}</div>
        ${names}
        <div style="margin-top:auto;padding-top:2px;border-top:1px solid #ccc">
          <div style="font-size:7px;color:#444;overflow:hidden;white-space:normal;word-break:break-word">${jamaah[0]?.alamat_lengkap ?? ''}</div>
          ${jamaah[0]?.no_hp ? `<div style="font-size:7px;color:#666">${jamaah[0].no_hp}</div>` : ''}
        </div>
      </div>`
    }).join('')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size:${paperW}mm ${paperH}mm; margin:${marginMm}mm }
      body{margin:0} .grid{display:grid;grid-template-columns:repeat(${cols},${lw}mm);gap:${gapMm}mm}
    </style></head><body><div class="grid">${labelHTMLs}</div></body></html>`
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

      labels.forEach(({ hewan, jamaah }, idx) => {
        if (idx > 0 && idx % labelsPerPage === 0) pdf.addPage()
        const pos = idx % labelsPerPage
        const col = pos % cols
        const row = Math.floor(pos / cols)
        const x = marginMm + col * (lw + gapMm)
        const y = marginMm + row * (lh + gapMm)

        pdf.setDrawColor(0); pdf.setLineWidth(0.3)
        pdf.rect(x, y, lw, lh)

        pdf.setFont('courier', 'bold'); pdf.setFontSize(9); pdf.setTextColor(0)
        pdf.text(hewan.kode_resi, x + 2, y + 5)

        pdf.setLineWidth(0.15); pdf.line(x, y + 7, x + lw, y + 7)

        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7)
        let ty = y + 11
        jamaah.forEach((j, ji) => {
          pdf.text((jamaah.length > 1 ? `${ji + 1}. ` : '') + j.nama_lengkap.slice(0, 40), x + 2, ty)
          ty += 3.5
        })

        const addr = jamaah[0]?.alamat_lengkap ?? ''
        const hp = jamaah[0]?.no_hp ?? ''
        if (addr || hp) {
          const divY = y + lh - (hp ? 10 : 7)
          pdf.setDrawColor(180); pdf.line(x, divY, x + lw, divY); pdf.setDrawColor(0)
          pdf.setFontSize(5.5); pdf.setTextColor(80)
          if (addr) {
            const lines = pdf.splitTextToSize(addr, lw - 4)
            const maxLines = hp ? 2 : 3
            lines.slice(0, maxLines).forEach((ln: string, li: number) => {
              pdf.text(ln, x + 2, divY + 3 + li * 3)
            })
          }
          if (hp) pdf.text(hp, x + 2, y + lh - 2)
          pdf.setTextColor(0)
        }
      })

      pdf.save('label-qurban.pdf')
    } finally { setIsGenerating(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onBack && <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><ArrowLeft size={16} /></button>}
            <h2 className="font-bold text-gray-900 text-lg">Cetak Label PVC</h2>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ukuran Label</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Lebar (mm)</label>
                  <input type="number" value={config.lebarMm} onChange={e => setConfig(c => ({ ...c, lebarMm: +e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Tinggi (mm)</label>
                  <input type="number" value={config.tinggiMm} onChange={e => setConfig(c => ({ ...c, tinggiMm: +e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Kolom per baris</label>
                  <select value={config.kolomPerBaris} onChange={e => setConfig(c => ({ ...c, kolomPerBaris: +e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n} kolom</option>)}
                  </select>
                </div>
                <button onClick={() => setConfig(DEFAULT_CONFIG)} className="text-xs text-emerald-600 hover:underline">
                  Reset ke default (85.6 × 53.98mm)
                </button>
              </div>
            </div>

            <div className="text-xs space-y-1.5 pt-1 border-t border-gray-100">
              {!fitsInPaper && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <p className="text-amber-700 font-medium text-[11px]">⚠ Label terlalu lebar</p>
                  <p className="text-amber-600 text-[10px] mt-0.5">
                    {cols} kol × {lw}mm = {(cols * lw + (cols-1) * gapMm).toFixed(1)}mm,<br/>
                    maks {usableW.toFixed(0)}mm
                  </p>
                  <button
                    onClick={() => setConfig(c => ({ ...c, lebarMm: autoFitLw }))}
                    className="mt-1.5 w-full py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-medium rounded transition"
                  >
                    Auto-fit → {autoFitLw}mm
                  </button>
                </div>
              )}
              <p className="text-gray-400">{labels.length} label • {labelsPerPage}/hal • <span className="font-medium text-gray-600">{totalPages} hal.</span></p>
              <p className="text-gray-400">{paperW.toFixed(0)} × {paperH.toFixed(0)} mm</p>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-gray-200 p-6">

            {/* Zoom controls */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                {`Preview hal. 1${totalPages > 1 ? ` dari ${totalPages}` : ''}`}
              </p>
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
                  <div style={{
                    position: 'absolute',
                    top: marginMm * MM_TO_PX, left: marginMm * MM_TO_PX,
                    right: marginMm * MM_TO_PX, bottom: marginMm * MM_TO_PX,
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${cols}, ${lw * MM_TO_PX}px)`,
                      gap: `${gapMm * MM_TO_PX}px`,
                    }}>
                      {firstPageLabels.map(({ hewan, jamaah }, idx) => (
                        <LabelCard key={idx} hewan={hewan} jamaah={jamaah} lw={lw} lh={lh} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {totalPages > 1 && (
              <p className="text-xs text-gray-400 mt-4 text-center">
                {labels.length - firstPageLabels.length} label lagi di {totalPages - 1} halaman berikutnya
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
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
