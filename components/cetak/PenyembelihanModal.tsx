'use client'

import { useState } from 'react'
import { X, Printer, Download, ArrowLeft } from 'lucide-react'
import type { Hewan, Jamaah } from '@/types'

interface KelompokData { hewan: Hewan; jamaah: Jamaah[] }
interface Props { data: KelompokData[]; onClose: () => void; onBack?: () => void }

const MM_TO_PX = 3.7795

// ── Spec exact dari docx ───────────────────────────────────────────────────
// SAPI: A4 Landscape 297×210mm, margin 25.4mm, font 40pt/36pt/26pt
const SAPI_W = 297, SAPI_H = 210, SAPI_M = 25.4
const SAPI_CW = SAPI_W - 2 * SAPI_M   // 246.2mm
const SAPI_CH = SAPI_H - 2 * SAPI_M   // 159.2mm
const SAPI_ROW_H = SAPI_CH / 8        // 19.9mm per baris (1 header + 7 nama)
const SAPI_NO_W = 24                   // lebar kolom nomor mm
const SAPI_FONT_HEADER = 40            // pt
const SAPI_FONT_NO     = 36            // pt
const SAPI_FONT_NAME   = 26            // pt

// KAMBING: A4 Portrait 210×297mm, margin 8.8mm, font 50pt
const KMB_W = 210, KMB_H = 297, KMB_M = 8.8
const KMB_CW = KMB_W - 2 * KMB_M     // 192.4mm
const KMB_CH = KMB_H - 2 * KMB_M     // 279.4mm
const KMB_NO_W = 28                    // lebar kolom nomor mm
const KMB_FONT = 50                    // pt

// pt → px di 96dpi
const ptToPx = (pt: number) => pt * 4 / 3
// pt → mm
const ptToMm = (pt: number) => pt * 25.4 / 72

function isKambing(hewan: Hewan) { return hewan.kode_resi.toUpperCase().startsWith('KMB') }

// ── Preview Component: 1 lembar sapi ────────────────────────────────────────
function SapiSheet({ hewan, jamaah }: { hewan: Hewan; jamaah: Jamaah[] }) {
  const paperWpx = SAPI_W * MM_TO_PX
  const paperHpx = SAPI_H * MM_TO_PX
  const mPx      = SAPI_M * MM_TO_PX
  const cwPx     = SAPI_CW * MM_TO_PX
  const chPx     = SAPI_CH * MM_TO_PX
  const rowHpx   = SAPI_ROW_H * MM_TO_PX
  const noWpx    = SAPI_NO_W * MM_TO_PX
  const BORDER   = '2px solid #000'

  return (
    <div style={{ position: 'absolute', inset: mPx }}>
      {/* Header — kode hewan, centered, 40pt */}
      <div style={{
        width: cwPx, height: rowHpx,
        border: BORDER,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        <span style={{ fontFamily: 'Arial,sans-serif', fontWeight: 900, fontSize: ptToPx(SAPI_FONT_HEADER), color: '#000', letterSpacing: 2 }}>
          {hewan.kode_resi}
        </span>
      </div>
      {/* Baris nama */}
      {jamaah.map((j, i) => (
        <div key={j.id} style={{ display: 'flex', width: cwPx, height: rowHpx }}>
          {/* Nomor */}
          <div style={{
            width: noWpx, height: rowHpx, flexShrink: 0,
            borderBottom: BORDER, borderLeft: BORDER, borderRight: BORDER,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxSizing: 'border-box',
          }}>
            <span style={{ fontFamily: 'Arial,sans-serif', fontWeight: 900, fontSize: ptToPx(SAPI_FONT_NO), color: '#000' }}>
              {i + 1}
            </span>
          </div>
          {/* Nama */}
          <div style={{
            flex: 1, height: rowHpx,
            borderBottom: BORDER, borderRight: BORDER,
            display: 'flex', alignItems: 'center',
            padding: `0 ${8 * MM_TO_PX}px`,
            boxSizing: 'border-box',
          }}>
            <span style={{ fontFamily: 'Arial,sans-serif', fontWeight: 700, fontSize: ptToPx(SAPI_FONT_NAME), color: '#000', lineHeight: 1.2 }}>
              {j.nama_lengkap}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Preview Component: 1 halaman kambing ────────────────────────────────────
function KambingSheet({ entries, kambingPerHal, showTitle, paperW, paperH }: {
  entries: Array<{ hewan: Hewan; jamaah: Jamaah; globalNo: number }>
  kambingPerHal: number
  showTitle: boolean
  paperW: number
  paperH: number
}) {
  const mPx     = KMB_M * MM_TO_PX
  const cwPx    = (paperW - 2 * KMB_M) * MM_TO_PX
  const chPx    = (paperH - 2 * KMB_M) * MM_TO_PX
  const titleHpx = showTitle ? 20 * MM_TO_PX : 0
  const rowHpx  = (chPx - titleHpx) / kambingPerHal
  const noWpx   = KMB_NO_W * MM_TO_PX
  const BORDER  = '1.5px solid #000'

  return (
    <div style={{ position: 'absolute', inset: mPx }}>
      {showTitle && (
        <div style={{ height: titleHpx, display: 'flex', alignItems: 'flex-end', paddingBottom: 4, marginBottom: 4 }}>
          <span style={{ fontFamily: 'Arial,sans-serif', fontWeight: 700, fontSize: ptToPx(16), color: '#000' }}>
            TIPE C (Penitipan Kambing)
          </span>
        </div>
      )}
      {entries.map(({ hewan, jamaah, globalNo }) => (
        <div key={globalNo} style={{ display: 'flex', width: cwPx, height: rowHpx }}>
          {/* Nomor */}
          <div style={{
            width: noWpx, height: rowHpx, flexShrink: 0,
            border: BORDER,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxSizing: 'border-box', marginTop: '-1px',
          }}>
            <span style={{ fontFamily: 'Arial,sans-serif', fontWeight: 900, fontSize: ptToPx(KMB_FONT), color: '#000' }}>
              {globalNo}
            </span>
          </div>
          {/* Nama */}
          <div style={{
            flex: 1, height: rowHpx,
            borderTop: BORDER, borderBottom: BORDER, borderRight: BORDER,
            display: 'flex', alignItems: 'center',
            padding: `0 ${6 * MM_TO_PX}px`,
            boxSizing: 'border-box', marginTop: '-1px',
          }}>
            <span style={{ fontFamily: 'Arial,sans-serif', fontWeight: 700, fontSize: ptToPx(KMB_FONT), color: '#000', lineHeight: 1.2 }}>
              {jamaah.nama_lengkap}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function PenyembelihanModal({ data, onClose, onBack }: Props) {
  const [kambingPerHal, setKambingPerHal] = useState(2)
  const [kambingOrientation, setKambingOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [isGenerating, setIsGenerating]   = useState(false)
  const [zoomFactor, setZoomFactor]       = useState(1.0)
  const [previewType, setPreviewType]     = useState<'sapi' | 'kambing'>('sapi')

  // Dimensi kambing berdasarkan orientasi
  const kmbW = kambingOrientation === 'portrait' ? KMB_W : KMB_H
  const kmbH = kambingOrientation === 'portrait' ? KMB_H : KMB_W
  const kmbCW = kmbW - 2 * KMB_M
  const kmbCH = kmbH - 2 * KMB_M

  const sapiData    = data.filter(d => !isKambing(d.hewan))
  const kambingData = data.filter(d =>  isKambing(d.hewan))
  const kambingFlat = kambingData.flatMap(d => d.jamaah.map(j => ({ hewan: d.hewan, jamaah: j })))

  const sapiPages    = sapiData.length
  const kambingPages = Math.ceil(kambingFlat.length / kambingPerHal)
  const totalPages   = sapiPages + kambingPages

  // Skala preview
  const MAX_DIM = 560
  const sapiScale   = Math.min(MAX_DIM / (SAPI_W * MM_TO_PX), MAX_DIM / (SAPI_H * MM_TO_PX), 1)
  const kmbScale    = Math.min(MAX_DIM / (kmbW * MM_TO_PX), MAX_DIM / (kmbH * MM_TO_PX), 1)
  const baseScale   = previewType === 'sapi' ? sapiScale : kmbScale
  const effScale    = baseScale * zoomFactor

  const previewW    = previewType === 'sapi' ? SAPI_W * MM_TO_PX : kmbW * MM_TO_PX
  const previewH    = previewType === 'sapi' ? SAPI_H * MM_TO_PX : kmbH * MM_TO_PX

  const previewKmb  = kambingFlat.slice(0, kambingPerHal).map((e, i) => ({ ...e, globalNo: i + 1 }))

  // ── Build print HTML ─────────────────────────────────────────────────────
  function buildPrintHTML() {
    const pages: string[] = []

    // Halaman sapi — A4 Landscape, exact docx specs
    sapiData.forEach(({ hewan, jamaah }) => {
      const nameRows = jamaah.map((j, i) => `
        <tr style="height:${100 / 8}%">
          <td style="border:2px solid #000;text-align:center;vertical-align:middle;font-size:${SAPI_FONT_NO}pt;font-weight:900;font-family:Arial;color:#000;width:${SAPI_NO_W}mm">${i + 1}</td>
          <td style="border:2px solid #000;vertical-align:middle;padding:0 8mm;font-size:${SAPI_FONT_NAME}pt;font-weight:700;font-family:Arial;color:#000">${j.nama_lengkap}</td>
        </tr>`).join('')

      pages.push(`
        <div style="width:${SAPI_W}mm;height:${SAPI_H}mm;box-sizing:border-box;padding:${SAPI_M}mm;page-break-after:always">
          <table style="border-collapse:collapse;width:100%;height:100%;table-layout:fixed">
            <colgroup><col style="width:${SAPI_NO_W}mm"/><col/></colgroup>
            <tbody>
              <tr style="height:${100 / 8}%">
                <td colspan="2" style="border:2px solid #000;text-align:center;vertical-align:middle;font-size:${SAPI_FONT_HEADER}pt;font-weight:900;font-family:Arial;color:#000;letter-spacing:2px">${hewan.kode_resi}</td>
              </tr>
              ${nameRows}
            </tbody>
          </table>
        </div>`)
    })

    // Halaman kambing — orientasi sesuai pilihan user
    for (let i = 0; i < kambingFlat.length; i += kambingPerHal) {
      const isFirstPage = i === 0
      const batch       = kambingFlat.slice(i, i + kambingPerHal)
      const rowPct      = (100 - (isFirstPage ? 5 : 0)) / kambingPerHal

      const titleHTML = isFirstPage ? `
        <div style="font-family:Arial;font-weight:700;font-size:16pt;color:#000;margin-bottom:6mm">
          TIPE C (Penitipan Kambing)
        </div>` : ''

      const tableRows = batch.map((e, bi) => {
        const no = i + bi + 1
        return `
          <tr style="height:${rowPct}%">
            <td style="border:1.5px solid #000;text-align:center;vertical-align:middle;font-size:${KMB_FONT}pt;font-weight:900;font-family:Arial;color:#000;width:${KMB_NO_W}mm">${no}</td>
            <td style="border:1.5px solid #000;vertical-align:middle;padding:0 6mm;font-size:${KMB_FONT}pt;font-weight:700;font-family:Arial;color:#000">${e.jamaah.nama_lengkap}</td>
          </tr>`
      }).join('')

      pages.push(`
        <div style="width:${kmbW}mm;height:${kmbH}mm;box-sizing:border-box;padding:${KMB_M}mm;page-break-after:always;display:flex;flex-direction:column">
          ${titleHTML}
          <table style="border-collapse:collapse;width:100%;flex:1;table-layout:fixed">
            <colgroup><col style="width:${KMB_NO_W}mm"/><col/></colgroup>
            <tbody>${tableRows}</tbody>
          </table>
        </div>`)
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { margin:0 }
      body { margin:0; font-family:Arial,sans-serif }
    </style></head><body>${pages.join('')}</body></html>`
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildPrintHTML())
    win.document.close()
    win.onload = () => win.print()
  }

  // ── PDF (jsPDF) ──────────────────────────────────────────────────────────
  async function handleDownloadPDF() {
    setIsGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      function textVCenter(pdf: InstanceType<typeof jsPDF>, text: string, x: number, cellY: number, cellH: number, fontPt: number, opts?: object) {
        const y = cellY + cellH / 2 + ptToMm(fontPt) * 0.36
        pdf.text(text, x, y, opts)
      }

      // Selalu mulai dengan landscape untuk sapi (atau portrait kalau hanya kambing)
      const startOrientation = sapiData.length > 0 ? 'landscape' : 'portrait'
      const pdf = new jsPDF({ orientation: startOrientation, unit: 'mm', format: 'a4' })
      let isFirst = true

      // ── Halaman sapi (landscape A4) ───────────────────────────────────
      sapiData.forEach(({ hewan, jamaah }) => {
        if (!isFirst) pdf.addPage('a4', 'landscape')
        isFirst = false
        const mx = SAPI_M, my = SAPI_M
        const cw = SAPI_CW
        const rh = SAPI_ROW_H, nw = SAPI_NO_W
        pdf.setDrawColor(0); pdf.setLineWidth(0.4)
        pdf.rect(mx, my, cw, rh)
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(SAPI_FONT_HEADER); pdf.setTextColor(0)
        textVCenter(pdf, hewan.kode_resi, mx + cw / 2, my, rh, SAPI_FONT_HEADER, { align: 'center' })
        jamaah.forEach((j, i) => {
          const ry = my + rh + i * rh
          pdf.setLineWidth(0.4)
          pdf.rect(mx, ry, nw, rh)
          pdf.rect(mx + nw, ry, cw - nw, rh)
          pdf.setFontSize(SAPI_FONT_NO)
          textVCenter(pdf, String(i + 1), mx + nw / 2, ry, rh, SAPI_FONT_NO, { align: 'center' })
          pdf.setFontSize(SAPI_FONT_NAME)
          const nl = pdf.splitTextToSize(j.nama_lengkap, cw - nw - 8)
          const lh = ptToMm(SAPI_FONT_NAME) * 1.3
          const th = nl.length * lh
          const sy = ry + (rh - th) / 2 + ptToMm(SAPI_FONT_NAME) * 0.75
          nl.slice(0, 2).forEach((line: string, li: number) => pdf.text(line, mx + nw + 5, sy + li * lh))
        })
      })

      // ── Halaman kambing (portrait A4) ─────────────────────────────────

      for (let i = 0; i < kambingFlat.length; i += kambingPerHal) {
        const isFirstKmb = i === 0
        pdf.addPage('a4', kambingOrientation)
        const batch = kambingFlat.slice(i, i + kambingPerHal)
        const mx    = KMB_M, my = KMB_M
        const cw    = kmbCW
        const nw    = KMB_NO_W
        let   curY  = my

        // Judul hanya di halaman pertama
        if (isFirstKmb) {
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(0)
          pdf.text('TIPE C (Penitipan Kambing)', mx, curY + 8)
          curY += 14
        }

        const rh = (kmbH - my - curY) / kambingPerHal

        batch.forEach((e, bi) => {
          const no = i + bi + 1
          const ry = curY + bi * rh
          pdf.setDrawColor(0); pdf.setLineWidth(0.4)
          pdf.rect(mx, ry, nw, rh)
          pdf.rect(mx + nw, ry, cw - nw, rh)
          // Nomor
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(KMB_FONT); pdf.setTextColor(0)
          textVCenter(pdf, String(no), mx + nw / 2, ry, rh, KMB_FONT, { align: 'center' })
          // Nama
          const nl = pdf.splitTextToSize(e.jamaah.nama_lengkap, cw - nw - 8)
          const lh = ptToMm(KMB_FONT) * 1.3
          const th = nl.length * lh
          const sy = ry + (rh - th) / 2 + ptToMm(KMB_FONT) * 0.75
          nl.slice(0, 2).forEach((line: string, li: number) => pdf.text(line, mx + nw + 6, sy + li * lh))
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

            {/* Sapi info */}
            {sapiData.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sapi</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-600">
                  <p><span className="font-medium">Format:</span> A4 Landscape</p>
                  <p><span className="font-medium">Margin:</span> 25.4 mm (1 inch)</p>
                  <p><span className="font-medium">Font:</span> 40pt / 36pt / 26pt</p>
                  <p><span className="font-medium">Total:</span> {sapiPages} halaman</p>
                </div>
              </div>
            )}

            {/* Kambing settings */}
            {kambingData.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kambing</p>
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-600">
                    <p><span className="font-medium">Format:</span> A4 {kambingOrientation === 'portrait' ? 'Potret' : 'Landscape'}</p>
                    <p><span className="font-medium">Margin:</span> 8.8 mm</p>
                    <p><span className="font-medium">Font:</span> 50pt bold</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-2 block">Orientasi</label>
                    <div className="flex gap-2">
                      {(['portrait', 'landscape'] as const).map(o => (
                        <button key={o} onClick={() => setKambingOrientation(o)}
                          className={`flex-1 py-2 text-xs rounded-lg border font-medium transition ${kambingOrientation === o ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {o === 'portrait' ? 'Potret' : 'Landscape'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="text-xs text-gray-600 block mt-2">Kambing per halaman</label>
                  <select value={kambingPerHal} onChange={e => setKambingPerHal(+e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} per halaman</option>)}
                  </select>
                  <p className="text-xs text-gray-400">{kambingFlat.length} kambing • {kambingPages} halaman</p>
                </div>
              </div>
            )}

            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-600">Total: {totalPages} halaman</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {sapiPages > 0 && `${sapiPages} sapi`}{sapiPages > 0 && kambingPages > 0 && ' + '}{kambingPages > 0 && `${kambingPages} kambing`}
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
                  {Math.round(effScale * 100)}%
                </span>
                <button onClick={() => setZoomFactor(z => Math.min(4.0, +(z + 0.25).toFixed(2)))}
                  disabled={zoomFactor >= 4.0}
                  className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:text-gray-300 transition border-l border-gray-200">+</button>
                <button onClick={() => setZoomFactor(1.0)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 transition border-l border-gray-200">Fit</button>
              </div>
            </div>

            <div className="flex justify-center">
              <div style={{ width: previewW * effScale, height: previewH * effScale, position: 'relative', flexShrink: 0 }}
                className="shadow-2xl">
                <div style={{
                  width: previewW, height: previewH,
                  position: 'absolute', top: 0, left: 0,
                  transform: `scale(${effScale})`, transformOrigin: 'top left',
                  background: 'white', overflow: 'hidden',
                }}>
                  {previewType === 'sapi' && sapiData[0] ? (
                    <SapiSheet hewan={sapiData[0].hewan} jamaah={sapiData[0].jamaah} />
                  ) : previewType === 'kambing' && previewKmb.length > 0 ? (
                    <KambingSheet entries={previewKmb} kambingPerHal={kambingPerHal} showTitle paperW={kmbW} paperH={kmbH} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-400">Tidak ada data</div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center flex-shrink-0">
              {previewType === 'sapi'
                ? `Preview sapi pertama dari ${sapiPages} hal • A4 Landscape`
                : `Preview hal. 1 kambing (${kambingFlat.length} entri, ${kambingPerHal}/hal) • A4 ${kambingOrientation === 'portrait' ? 'Potret' : 'Landscape'}`}
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
