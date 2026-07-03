'use client'

import { useState } from 'react'
import { X, Printer, Download, ArrowLeft } from 'lucide-react'
import type { Jamaah, Hewan } from '@/types'

interface LabelData { hewan: Hewan; jamaah: Jamaah[] }
interface LabelItem { hewan: Hewan; jamaah: Jamaah; nomorUrut: number }

// Ambil angka dari kode_resi, mis. "KMB-014" -> 14
function extractKodeNumber(kode: string): number {
  const match = kode.match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}
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

// ─── Label Card — putih bersih, teks mengisi ruang ───────────────────────────
function LabelCard({ hewan, jamaah, nomorUrut, lw, lh }: {
  hewan: Hewan; jamaah: Jamaah; nomorUrut: number; lw: number; lh: number
}) {
  const wpx = lw * MM_TO_PX
  const hpx = lh * MM_TO_PX

  return (
    <div
      style={{ width: wpx, height: hpx, flexShrink: 0, boxSizing: 'border-box' }}
      className="border border-gray-800 bg-white flex flex-col overflow-hidden"
    >
      {/* Kode hewan + nomor urut pengurban — putih, no ink fill */}
      <div className="flex items-baseline justify-between px-[6px] pt-[4px] pb-[2px] border-b-2 border-gray-800 flex-shrink-0">
        <span className="font-extrabold text-[18px] tracking-[0.5px] font-sans leading-none text-black">
          {hewan.kode_resi}
        </span>
        <span className="text-[9px] font-bold font-sans uppercase tracking-wider leading-none text-gray-500">
          NO. {nomorUrut}
        </span>
      </div>

      {/* Nama */}
      <div className="px-[6px] pt-[3px] pb-[2px] border-b border-gray-300 flex-shrink-0">
        <p className="font-bold text-[15px] leading-[1.25] text-gray-900 break-words">
          {jamaah.nama_lengkap}
        </p>
        {jamaah.atas_nama && (
          <p className="text-[10.5px] text-gray-500 leading-tight mt-[1px]">
            a/n {jamaah.atas_nama}
          </p>
        )}
      </div>

      {/* Alamat — flex-1, center vertikal agar alamat pendek tidak numpuk di atas */}
      <div className="px-[6px] pt-[2px] flex-1 overflow-hidden flex items-center">
        <p className="text-[13.5px] leading-[1.4] text-gray-700 break-words whitespace-normal">
          {jamaah.alamat_lengkap ?? '—'}
        </p>
      </div>

      {/* Telepon — selalu di bawah */}
      {jamaah.no_hp && (
        <div className="px-[6px] pb-[3px] pt-[2px] border-t border-gray-300 flex-shrink-0">
          <p className="text-[14px] font-bold text-gray-900 leading-none">
            Telp. {jamaah.no_hp}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LabelPVCModal({ data, onClose, onBack }: Props) {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [paperKey, setPaperKey] = useState<PaperKey>('A4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [isGenerating, setIsGenerating] = useState(false)
  const [zoomFactor, setZoomFactor] = useState(1.0)

  // 1 label per jamaah (flatMap)
  // Kambing: nomor urut = angka dari kode_resi (KMB-014 -> 14)
  // Sapi: nomor urut = posisi jamaah dalam kelompok sapinya (1-7)
  const labels: LabelItem[] = data.flatMap(({ hewan, jamaah }) =>
    jamaah.map((j, idx) => ({
      hewan,
      jamaah: j,
      nomorUrut: hewan.jenis_hewan === 'SAPI' ? idx + 1 : extractKodeNumber(hewan.kode_resi),
    }))
  )

  const paperW = orientation === 'portrait' ? PAPER_SIZES[paperKey].w : PAPER_SIZES[paperKey].h
  const paperH = orientation === 'portrait' ? PAPER_SIZES[paperKey].h : PAPER_SIZES[paperKey].w
  const paperWpx = paperW * MM_TO_PX
  const paperHpx = paperH * MM_TO_PX

  const marginMm = 10, gapMm = 2
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
  const effectiveScale = previewScale * zoomFactor

  const firstPageLabels = labels.slice(0, labelsPerPage)

  // ── Print HTML ────────────────────────────────────────────────────────────
  function buildPrintHTML() {
    const labelHTMLs = labels.map(({ hewan, jamaah, nomorUrut }) => `
      <div style="width:${lw}mm;height:${lh}mm;border:1px solid #1f2937;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;break-inside:avoid;font-family:Arial,Helvetica,sans-serif;background:white">
        <div style="display:flex;align-items:baseline;justify-content:space-between;padding:3px 6px 2px;border-bottom:2px solid #1f2937;flex-shrink:0">
          <span style="font-weight:800;font-size:17px;letter-spacing:0.5px;color:#000;line-height:1">${hewan.kode_resi}</span>
          <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;line-height:1">NO. ${nomorUrut}</span>
        </div>
        <div style="padding:3px 6px 2px;border-bottom:1px solid #d1d5db;flex-shrink:0">
          <p style="font-weight:700;font-size:14.5px;line-height:1.25;margin:0;color:#111;word-break:break-word">${jamaah.nama_lengkap}</p>
          ${jamaah.atas_nama ? `<p style="font-size:10.5px;color:#6b7280;margin:2px 0 0;line-height:1.25">a/n ${jamaah.atas_nama}</p>` : ''}
        </div>
        <div style="padding:2px 6px;flex:1;overflow:hidden;display:flex;align-items:center">
          <p style="font-size:13px;line-height:1.4;margin:0;color:#374151;word-break:break-word;white-space:normal">${jamaah.alamat_lengkap ?? '—'}</p>
        </div>
        ${jamaah.no_hp ? `<div style="padding:2px 6px 3px;border-top:1px solid #d1d5db;flex-shrink:0"><p style="font-size:13.5px;font-weight:700;color:#111;margin:0;line-height:1.25">Telp. ${jamaah.no_hp}</p></div>` : ''}
      </div>`).join('')

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size:${paperW}mm ${paperH}mm; margin:${marginMm}mm }
      body { margin:0 }
      .grid { display:grid; grid-template-columns:repeat(${cols},${lw}mm); gap:${gapMm}mm }
    </style></head><body><div class="grid">${labelHTMLs}</div></body></html>`
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildPrintHTML())
    win.document.close()
    win.onload = () => win.print()
  }

  // ── PDF (jsPDF) ───────────────────────────────────────────────────────────
  async function handleDownloadPDF() {
    setIsGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const fmt = paperKey === 'A4' ? 'a4' : paperKey === 'Letter' ? 'letter'
        : [PAPER_SIZES[paperKey].w, PAPER_SIZES[paperKey].h] as [number, number]
      const pdf = new jsPDF({ orientation, unit: 'mm', format: fmt })

      labels.forEach(({ hewan, jamaah, nomorUrut }, idx) => {
        if (idx > 0 && idx % labelsPerPage === 0) pdf.addPage()
        const pos = idx % labelsPerPage
        const col = pos % cols
        const row = Math.floor(pos / cols)
        const x = marginMm + col * (lw + gapMm)
        const y = marginMm + row * (lh + gapMm)

        // ── Border luar ───────────────────────────────────────────────────
        pdf.setDrawColor(31, 41, 55); pdf.setLineWidth(0.3)
        pdf.rect(x, y, lw, lh)

        // ── Kode hewan + nomor urut pengurban (putih, no fill) ────────────
        const headerH = 8.5
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(0)
        pdf.text(hewan.kode_resi, x + 2.5, y + 5, { charSpace: 0.25 })
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(100)
        pdf.text(`NO. ${nomorUrut}`, x + lw - 2.5, y + 5, { align: 'right' })

        // Garis tebal di bawah header
        pdf.setDrawColor(31, 41, 55); pdf.setLineWidth(0.5)
        pdf.line(x, y + headerH, x + lw, y + headerH)
        pdf.setLineWidth(0.1)

        // ── Nama ──────────────────────────────────────────────────────────
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(0)
        const nameLines = pdf.splitTextToSize(jamaah.nama_lengkap, lw - 5)
        let curY = y + headerH + 4.5
        nameLines.slice(0, 2).forEach((line: string) => {
          pdf.text(line, x + 2.5, curY); curY += 5.6
        })
        if (jamaah.atas_nama) {
          pdf.setFont('helvetica', 'italic'); pdf.setFontSize(9.5); pdf.setTextColor(120)
          pdf.text(`a/n ${jamaah.atas_nama}`, x + 2.5, curY); curY += 4.8
        }

        // Garis tipis pemisah nama - alamat (beri jarak ekstra agar tidak nabrak teks alamat)
        pdf.setDrawColor(200); pdf.line(x, curY, x + lw, curY)
        curY += 4

        // ── Alamat (di-center vertikal di ruang tersisa agar alamat pendek
        //     tidak numpuk di atas dengan sisa ruang kosong di bawah).
        //     Font alamat otomatis mengecil bertahap HANYA jika ruang benar-
        //     benar tidak cukup, supaya alamat/telepon tidak pernah terpotong. ──
        const hpH = jamaah.no_hp ? 6 : 0
        const addrAreaTop = curY
        const addrAreaBottom = y + lh - hpH - (jamaah.no_hp ? 1.5 : 2.5)
        const addrAreaHeight = Math.max(4, addrAreaBottom - addrAreaTop)
        const addrText = jamaah.alamat_lengkap ?? '—'

        let addrFontSize = 11.5
        let addrLineH = 4.7
        let addrLines: string[] = []
        const ADDR_MIN_FONT = 8.5
        for (let fs = 11.5; fs >= ADDR_MIN_FONT; fs -= 0.5) {
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(fs)
          const lh_ = fs * 0.41
          const lines = pdf.splitTextToSize(addrText, lw - 5) as string[]
          const maxLines = Math.max(1, Math.floor(addrAreaHeight / lh_))
          addrFontSize = fs; addrLineH = lh_; addrLines = lines
          if (lines.length <= maxLines || fs === ADDR_MIN_FONT) break
        }
        const addrMaxLines = Math.max(1, Math.floor(addrAreaHeight / addrLineH))
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(addrFontSize); pdf.setTextColor(55)
        const shownAddrLines = addrLines.slice(0, addrMaxLines)
        // Jika masih kepanjangan di font minimum, beri elipsis di baris terakhir
        if (addrLines.length > shownAddrLines.length && shownAddrLines.length > 0) {
          const lastIdx = shownAddrLines.length - 1
          let last = shownAddrLines[lastIdx]
          while (pdf.getTextWidth(last + '…') > lw - 5 && last.length > 1) {
            last = last.slice(0, -1)
          }
          shownAddrLines[lastIdx] = last + '…'
        }
        const addrContentH = shownAddrLines.length * addrLineH
        const addrExtraSpace = Math.max(0, addrAreaHeight - addrContentH)
        let addrY = addrAreaTop + addrExtraSpace / 2 + addrFontSize * 0.29
        shownAddrLines.forEach((line: string) => {
          pdf.text(line, x + 2.5, addrY); addrY += addrLineH
        })

        // ── Telepon ───────────────────────────────────────────────────────
        if (jamaah.no_hp) {
          const hpY = y + lh - 1.5
          pdf.setDrawColor(200); pdf.line(x, hpY - 4, x + lw, hpY - 4)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11.5); pdf.setTextColor(0)
          pdf.text(`Telp. ${jamaah.no_hp}`, x + 2.5, hpY)
        }
        pdf.setDrawColor(0)
      })

      pdf.save('label-qurban.pdf')
    } finally { setIsGenerating(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">

        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="font-bold text-gray-900 text-lg">Cetak Label PVC</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* ── Settings ─────────────────────────────────────────────────── */}
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
                    {(['portrait', 'landscape'] as const).map(o => (
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
                  <input type="number" value={config.lebarMm}
                    onChange={e => setConfig(c => ({ ...c, lebarMm: +e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Tinggi (mm)</label>
                  <input type="number" value={config.tinggiMm}
                    onChange={e => setConfig(c => ({ ...c, tinggiMm: +e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Kolom per baris</label>
                  <select value={config.kolomPerBaris}
                    onChange={e => setConfig(c => ({ ...c, kolomPerBaris: +e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} kolom</option>)}
                  </select>
                </div>
                <button onClick={() => setConfig(DEFAULT_CONFIG)}
                  className="text-xs text-emerald-600 hover:underline">
                  Reset ke default (85.6 × 53.98mm)
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-gray-100">
              {!fitsInPaper && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <p className="text-amber-700 font-medium text-[11px]">⚠ Label terlalu lebar</p>
                  <p className="text-amber-600 text-[10px] mt-0.5">
                    {cols} kol × {lw}mm = {(cols * lw).toFixed(1)}mm,<br />
                    maks {usableW.toFixed(0)}mm
                  </p>
                  <button
                    onClick={() => setConfig(c => ({ ...c, lebarMm: autoFitLw }))}
                    className="mt-1.5 w-full py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-medium rounded transition">
                    Auto-fit → {autoFitLw}mm
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400">
                {labels.length} label • {labelsPerPage}/hal •{' '}
                <span className="font-medium text-gray-600">{totalPages} hal.</span>
              </p>
              <p className="text-xs text-gray-400">{paperW.toFixed(0)} × {paperH.toFixed(0)} mm</p>
            </div>
          </div>

          {/* ── Preview ───────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-auto bg-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                Preview hal. 1{totalPages > 1 ? ` dari ${totalPages}` : ''}
              </p>
              <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <button onClick={() => setZoomFactor(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                  disabled={zoomFactor <= 0.25}
                  className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:text-gray-300 transition border-r border-gray-200">−</button>
                <span className="px-3 py-1.5 text-xs font-medium text-gray-700 min-w-[52px] text-center select-none">
                  {Math.round(effectiveScale * 100)}%
                </span>
                <button onClick={() => setZoomFactor(z => Math.min(4.0, +(z + 0.25).toFixed(2)))}
                  disabled={zoomFactor >= 4.0}
                  className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:text-gray-300 transition border-l border-gray-200">+</button>
                <button onClick={() => setZoomFactor(1.0)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 transition border-l border-gray-200">Fit</button>
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
                      gap: gapMm * MM_TO_PX,
                    }}>
                      {firstPageLabels.map(({ hewan, jamaah, nomorUrut }, idx) => (
                        <LabelCard key={idx} hewan={hewan} jamaah={jamaah} nomorUrut={nomorUrut} lw={lw} lh={lh} />
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

        {/* Footer */}
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

