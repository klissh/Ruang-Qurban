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

function isKambing(hewan: Hewan) {
  return hewan.kode_resi.toUpperCase().startsWith('KMB')
}

export default function PenyembelihanModal({ data, onClose, onBack }: Props) {
  const [paperKey, setPaperKey]           = useState<PaperKey>('A4')
  const [orientation, setOrientation]     = useState<'portrait' | 'landscape'>('portrait')
  const [kambingPerHal, setKambingPerHal] = useState(2)
  const [isGenerating, setIsGenerating]   = useState(false)
  const [zoomFactor, setZoomFactor]       = useState(1.0)
  const [previewType, setPreviewType]     = useState<'sapi' | 'kambing'>('sapi')

  const paperW   = orientation === 'portrait' ? PAPER_SIZES[paperKey].w : PAPER_SIZES[paperKey].h
  const paperH   = orientation === 'portrait' ? PAPER_SIZES[paperKey].h : PAPER_SIZES[paperKey].w
  const paperWpx = paperW * MM_TO_PX
  const paperHpx = paperH * MM_TO_PX
  const marginMm = 12

  const sapiData    = data.filter(d => !isKambing(d.hewan))
  const kambingData = data.filter(d => isKambing(d.hewan))
  const kambingFlat = kambingData.flatMap(d => d.jamaah.map(j => ({ hewan: d.hewan, jamaah: j })))

  const sapiPages    = sapiData.length
  const kambingPages = Math.ceil(kambingFlat.length / kambingPerHal)
  const totalPages   = sapiPages + kambingPages

  const MAX_W = 500, MAX_H = 660
  const previewScale   = Math.min(MAX_W / paperWpx, MAX_H / paperHpx, 1)
  const effectiveScale = previewScale * zoomFactor

  // ── Preview: lembar sapi — putih, no fill, sama persis dengan docx ────────
  const SapiSheet = ({ hewan, jamaah }: { hewan: Hewan; jamaah: Jamaah[] }) => {
    const mPx    = marginMm * MM_TO_PX
    const usableH = paperHpx - mPx * 2
    const usableW = paperWpx - mPx * 2
    // Header: 16% tinggi usable, baris: sisanya dibagi rata
    const headerH = usableH * 0.16
    const rowH    = (usableH - headerH) / Math.max(jamaah.length, 1)

    return (
      <div style={{
        position: 'absolute', inset: mPx,
        border: '2.5px solid #111',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        background: 'white',
      }}>
        {/* Kode hewan — putih, teks besar, centered */}
        <div style={{
          height: headerH, flexShrink: 0,
          borderBottom: '2.5px solid #111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontWeight: 900,
            fontSize: Math.round(headerH * 0.52),
            letterSpacing: Math.round(headerH * 0.06),
            fontFamily: 'monospace',
            color: '#000',
            lineHeight: 1,
          }}>
            {hewan.kode_resi}
          </span>
        </div>

        {/* Baris nama — mengisi sisa halaman */}
        {jamaah.map((j, i) => (
          <div key={j.id} style={{
            height: rowH, flexShrink: 0,
            display: 'flex',
            borderBottom: i < jamaah.length - 1 ? '2px solid #111' : 'none',
          }}>
            {/* Nomor */}
            <div style={{
              width: usableW * 0.1, flexShrink: 0,
              borderRight: '2px solid #111',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontWeight: 700, fontSize: Math.round(rowH * 0.38), color: '#111' }}>
                {i + 1}
              </span>
            </div>
            {/* Nama */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              padding: `0 ${Math.round(usableW * 0.03)}px`,
            }}>
              <span style={{
                fontWeight: 700,
                fontSize: Math.round(rowH * 0.33),
                color: '#111',
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}>
                {j.nama_lengkap}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Preview: halaman kambing ───────────────────────────────────────────────
  const KambingSheet = ({ entries }: { entries: Array<{ hewan: Hewan; jamaah: Jamaah; globalNo: number }> }) => {
    const mPx     = marginMm * MM_TO_PX
    const usableH = paperHpx - mPx * 2
    const usableW = paperWpx - mPx * 2
    const headerH = 28
    const rowH    = (usableH - headerH - 8 * (entries.length - 1)) / entries.length

    return (
      <div style={{ position: 'absolute', inset: mPx, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          textAlign: 'center', borderBottom: '2px solid #111',
          paddingBottom: 6, marginBottom: 10, flexShrink: 0,
        }}>
          <p style={{ fontWeight: 700, fontSize: 14, margin: 0, letterSpacing: 1, color: '#111' }}>
            TIPE C — KAMBING QURBAN
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(({ hewan, jamaah, globalNo }) => (
            <div key={globalNo} style={{
              flex: 1, border: '2px solid #111', display: 'flex', alignItems: 'center', overflow: 'hidden',
            }}>
              <div style={{
                background: '#f3f4f6', borderRight: '2px solid #111',
                width: usableW * 0.12, alignSelf: 'stretch',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontWeight: 900, fontSize: Math.round(rowH * 0.35), color: '#111' }}>
                  {globalNo}
                </span>
              </div>
              <div style={{ padding: '6px 14px', flex: 1 }}>
                <p style={{
                  fontWeight: 700, fontSize: Math.round(rowH * 0.15),
                  margin: 0, color: '#6b7280', fontFamily: 'monospace', letterSpacing: 1,
                }}>
                  {hewan.kode_resi}
                </p>
                <p style={{
                  fontWeight: 700, fontSize: Math.round(rowH * 0.28),
                  margin: '4px 0 0', color: '#111', lineHeight: 1.2,
                }}>
                  {jamaah.nama_lengkap}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const previewSapi    = sapiData[0]
  const previewKambing = kambingFlat.slice(0, kambingPerHal).map((e, i) => ({ ...e, globalNo: i + 1 }))

  // ── Build print HTML ───────────────────────────────────────────────────────
  function buildPrintHTML() {
    const pages: string[] = []

    // Halaman sapi — putih, no fill
    sapiData.forEach(({ hewan, jamaah }) => {
      const rows = jamaah.map((j, i) => `
        <tr>
          <td style="border:2px solid #111;padding:0 12px;font-weight:700;font-size:18px;text-align:center;width:48px;color:#111;height:auto">${i + 1}</td>
          <td style="border:2px solid #111;padding:8px 16px;font-weight:700;font-size:18px;color:#111">${j.nama_lengkap}</td>
        </tr>`).join('')

      pages.push(`
        <div style="width:${paperW}mm;height:${paperH}mm;box-sizing:border-box;padding:${marginMm}mm;page-break-after:always;display:flex;flex-direction:column">
          <table style="border-collapse:collapse;width:100%;height:100%;table-layout:fixed">
            <tbody>
              <tr style="height:16%">
                <td colspan="2" style="border:2.5px solid #111;text-align:center;vertical-align:middle">
                  <span style="font-weight:900;font-size:44px;letter-spacing:5px;font-family:monospace;color:#000">${hewan.kode_resi}</span>
                </td>
              </tr>
              ${jamaah.map((j, i) => `
              <tr style="height:${84 / jamaah.length}%">
                <td style="border:2px solid #111;text-align:center;vertical-align:middle;font-weight:700;font-size:20px;color:#111;width:48px">${i + 1}</td>
                <td style="border:2px solid #111;padding:0 16px;vertical-align:middle;font-weight:700;font-size:20px;color:#111">${j.nama_lengkap}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`)
    })

    // Halaman kambing
    for (let i = 0; i < kambingFlat.length; i += kambingPerHal) {
      const batch = kambingFlat.slice(i, i + kambingPerHal)
      const rows = batch.map((e, bi) => {
        const no = i + bi + 1
        return `
          <div style="flex:1;border:2px solid #111;display:flex;align-items:center;overflow:hidden">
            <div style="background:#f3f4f6;border-right:2px solid #111;width:60px;align-self:stretch;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-weight:900;font-size:28px;color:#111">${no}</span>
            </div>
            <div style="padding:10px 18px;flex:1">
              <p style="font-weight:700;font-size:11px;margin:0;color:#6b7280;font-family:monospace;letter-spacing:1px">${e.hewan.kode_resi}</p>
              <p style="font-weight:700;font-size:22px;margin:4px 0 0;color:#111;line-height:1.2">${e.jamaah.nama_lengkap}</p>
            </div>
          </div>`
      }).join('')

      pages.push(`
        <div style="width:${paperW}mm;height:${paperH}mm;box-sizing:border-box;padding:${marginMm}mm;page-break-after:always;display:flex;flex-direction:column">
          <div style="text-align:center;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;flex-shrink:0">
            <p style="font-weight:700;font-size:13px;letter-spacing:1px;margin:0;color:#111">TIPE C — KAMBING QURBAN</p>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:10px">${rows}</div>
        </div>`)
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:${paperW}mm ${paperH}mm;margin:0} body{margin:0;font-family:Arial,sans-serif}
    </style></head><body>${pages.join('')}</body></html>`
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildPrintHTML())
    win.document.close()
    win.onload = () => win.print()
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  async function handleDownloadPDF() {
    setIsGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const fmt = paperKey === 'A4' ? 'a4' : paperKey === 'Letter' ? 'letter'
        : [PAPER_SIZES[paperKey].w, PAPER_SIZES[paperKey].h] as [number, number]
      const pdf = new jsPDF({ orientation, unit: 'mm', format: fmt })
      const mx = marginMm, my = marginMm
      const cw = paperW - 2 * mx
      const ch = paperH - 2 * my
      let isFirst = true

      // ── Halaman sapi — putih, no fill ─────────────────────────────────
      sapiData.forEach(({ hewan, jamaah }) => {
        if (!isFirst) pdf.addPage()
        isFirst = false

        const headerH = ch * 0.16
        const rowH    = (ch - headerH) / Math.max(jamaah.length, 1)

        // Border luar
        pdf.setDrawColor(17, 24, 39); pdf.setLineWidth(0.5)
        pdf.rect(mx, my, cw, ch)

        // Header: kode hewan — PUTIH, no fill
        const headerFontSize = Math.min(28, headerH * 0.55)
        pdf.setFont('courier', 'bold')
        pdf.setFontSize(headerFontSize)
        pdf.setTextColor(0)
        pdf.text(hewan.kode_resi, mx + cw / 2, my + headerH * 0.62, {
          align: 'center', charSpace: 3
        })
        // Garis bawah header
        pdf.setLineWidth(0.5)
        pdf.line(mx, my + headerH, mx + cw, my + headerH)

        // Baris nama
        pdf.setFont('helvetica', 'bold')
        const nameFontSize = Math.min(18, rowH * 0.38)
        const noFontSize   = Math.min(16, rowH * 0.35)
        const noColW       = cw * 0.1

        jamaah.forEach((j, i) => {
          const ry = my + headerH + i * rowH
          pdf.setLineWidth(0.3)
          // Garis bawah baris (kecuali terakhir sudah ada border luar)
          if (i < jamaah.length - 1) pdf.line(mx, ry + rowH, mx + cw, ry + rowH)
          // Garis kolom nomor
          pdf.line(mx + noColW, ry, mx + noColW, ry + rowH)

          // Nomor
          pdf.setFontSize(noFontSize); pdf.setTextColor(0)
          pdf.text(String(i + 1), mx + noColW / 2, ry + rowH * 0.62, { align: 'center' })

          // Nama
          pdf.setFontSize(nameFontSize)
          const nameLines = pdf.splitTextToSize(j.nama_lengkap, cw - noColW - 6)
          const lineH     = nameFontSize * 0.4
          const totalH    = nameLines.length * lineH
          const startY    = ry + (rowH - totalH) / 2 + lineH * 0.8
          nameLines.slice(0, 2).forEach((line: string, li: number) => {
            pdf.text(line, mx + noColW + 4, startY + li * lineH)
          })
        })
        pdf.setDrawColor(0)
      })

      // ── Halaman kambing ───────────────────────────────────────────────
      const kambingRowH = (ch - 14) / kambingPerHal - 4

      for (let i = 0; i < kambingFlat.length; i += kambingPerHal) {
        if (!isFirst) pdf.addPage()
        isFirst = false

        const batch = kambingFlat.slice(i, i + kambingPerHal)

        // Header
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(0)
        pdf.text('TIPE C — KAMBING QURBAN', paperW / 2, my + 6, { align: 'center' })
        pdf.setDrawColor(17, 24, 39); pdf.setLineWidth(0.5)
        pdf.line(mx, my + 9, paperW - mx, my + 9)

        let curY = my + 14
        const noColW = cw * 0.12

        batch.forEach((e, bi) => {
          const no  = i + bi + 1
          const boxH = kambingRowH

          // Border kotak
          pdf.setLineWidth(0.4)
          pdf.rect(mx, curY, cw, boxH)

          // Kolom nomor (abu tipis)
          pdf.setFillColor(243, 244, 246)
          pdf.rect(mx, curY, noColW, boxH, 'F')
          pdf.line(mx + noColW, curY, mx + noColW, curY + boxH)

          // Nomor
          const noFont = Math.min(20, boxH * 0.38)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(noFont); pdf.setTextColor(17)
          pdf.text(String(no), mx + noColW / 2, curY + boxH * 0.62, { align: 'center' })

          // Kode kambing
          pdf.setFont('courier', 'bold'); pdf.setFontSize(8); pdf.setTextColor(107)
          pdf.text(e.hewan.kode_resi, mx + noColW + 4, curY + 8)

          // Nama
          const nameFont = Math.min(17, boxH * 0.3)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(nameFont); pdf.setTextColor(0)
          const nameLines = pdf.splitTextToSize(e.jamaah.nama_lengkap, cw - noColW - 8)
          nameLines.slice(0, 2).forEach((line: string, li: number) => {
            pdf.text(line, mx + noColW + 4, curY + 14 + li * (nameFont * 0.42))
          })

          curY += boxH + 4
          pdf.setDrawColor(0)
        })
      }

      pdf.save('kertas-penyembelihan.pdf')
    } finally { setIsGenerating(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="font-bold text-gray-900 text-lg">Cetak Kertas Penyembelihan</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
            <X size={16} />
          </button>
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

            {sapiData.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sapi</p>
                <p className="text-xs text-gray-400">{sapiData.length} sapi • 1 halaman/sapi</p>
              </div>
            )}

            {kambingData.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kambing</p>
                <div className="space-y-2">
                  <label className="text-xs text-gray-600 block">Kambing per halaman</label>
                  <select value={kambingPerHal} onChange={e => setKambingPerHal(+e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n}>{n} per halaman</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400">{kambingFlat.length} kambing • {kambingPages} halaman</p>
                </div>
              </div>
            )}

            <div className="pt-1 border-t border-gray-100 space-y-1">
              <p className="text-xs font-medium text-gray-600">Total: {totalPages} halaman</p>
              <p className="text-xs text-gray-400">
                {sapiPages > 0 && `${sapiPages} hal sapi`}
                {sapiPages > 0 && kambingPages > 0 && ' + '}
                {kambingPages > 0 && `${kambingPages} hal kambing`}
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-gray-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {sapiData.length > 0 && (
                  <button onClick={() => setPreviewType('sapi')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition ${previewType === 'sapi' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                    Sapi ({sapiData.length})
                  </button>
                )}
                {kambingData.length > 0 && (
                  <button onClick={() => setPreviewType('kambing')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition ${previewType === 'kambing' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                    Kambing ({kambingFlat.length})
                  </button>
                )}
              </div>

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
                  {previewType === 'sapi' && previewSapi ? (
                    <SapiSheet hewan={previewSapi.hewan} jamaah={previewSapi.jamaah} />
                  ) : previewType === 'kambing' && previewKambing.length > 0 ? (
                    <KambingSheet entries={previewKambing} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-400">
                      Tidak ada data
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center flex-shrink-0">
              {previewType === 'sapi'
                ? `Preview sapi pertama dari ${sapiPages} halaman`
                : `Preview hal. 1 kambing — ${kambingFlat.length} entri, ${kambingPerHal}/hal`}
            </p>
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
