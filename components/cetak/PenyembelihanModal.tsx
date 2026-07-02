'use client'

import { useState } from 'react'
import { X, ArrowLeft, Download } from 'lucide-react'
import type { Hewan, Jamaah } from '@/types'

interface KelompokData { hewan: Hewan; jamaah: Jamaah[] }
interface Props { data: KelompokData[]; onClose: () => void; onBack?: () => void }

const MM_TO_PX = 3.7795

// ── Spec exact dari docx ───────────────────────────────────────────────────
const SAPI_M = 25.4   // margin sapi (1 inch)
const KMB_M  = 8.8    // margin kambing
const KMB_NO_W = 28   // lebar kolom nomor kambing (mm)
const SAPI_NO_W = 24  // lebar kolom nomor sapi (mm)

// Font sizes (fixed sesuai docx)
const SAPI_FONT_HEADER = 40
const SAPI_FONT_NO     = 36
const SAPI_FONT_NAME   = 26
const KMB_FONT         = 50

const ptToPx = (pt: number) => pt * 4 / 3
const ptToMm = (pt: number) => pt * 25.4 / 72

function isKambing(h: Hewan) { return h.kode_resi.toUpperCase().startsWith('KMB') }

// Dimensi kertas berdasarkan orientasi (A4)
function paperDims(orientation: 'portrait' | 'landscape') {
  return orientation === 'landscape'
    ? { w: 297, h: 210 }
    : { w: 210, h: 297 }
}

// ── Preview: 1 lembar sapi ────────────────────────────────────────────────
function SapiSheet({ hewan, jamaah, orientation }: {
  hewan: Hewan; jamaah: Jamaah[]; orientation: 'portrait' | 'landscape'
}) {
  const { w, h } = paperDims(orientation)
  const wpx  = w * MM_TO_PX
  const hpx  = h * MM_TO_PX
  const mPx  = SAPI_M * MM_TO_PX
  const cwPx = (w - 2 * SAPI_M) * MM_TO_PX
  const chPx = (h - 2 * SAPI_M) * MM_TO_PX
  const rh   = chPx / 8   // 1 header + 7 baris
  const nwPx = SAPI_NO_W * MM_TO_PX
  const B    = '2px solid #000'

  return (
    <div style={{ position: 'absolute', inset: mPx }}>
      {/* Header */}
      <div style={{ width: cwPx, height: rh, border: B, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Arial', fontWeight: 900,
          fontSize: ptToPx(SAPI_FONT_HEADER), color: '#000', letterSpacing: 2 }}>
          {hewan.kode_resi}
        </span>
      </div>
      {/* Baris nama */}
      {jamaah.map((j, i) => (
        <div key={j.id} style={{ display: 'flex', width: cwPx, height: rh }}>
          <div style={{ width: nwPx, height: rh, flexShrink: 0, boxSizing: 'border-box',
            borderBottom: B, borderLeft: B, borderRight: B,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Arial', fontWeight: 900,
              fontSize: ptToPx(SAPI_FONT_NO), color: '#000' }}>{i + 1}</span>
          </div>
          <div style={{ flex: 1, height: rh, boxSizing: 'border-box',
            borderBottom: B, borderRight: B,
            display: 'flex', alignItems: 'center', padding: `0 ${6 * MM_TO_PX}px` }}>
            <span style={{ fontFamily: 'Arial', fontWeight: 700,
              fontSize: ptToPx(SAPI_FONT_NAME), color: '#000', lineHeight: 1.2 }}>
              {j.nama_lengkap}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Preview: 1 halaman kambing ────────────────────────────────────────────
function KambingSheet({ entries, kambingPerHal, showTitle, orientation }: {
  entries: Array<{ hewan: Hewan; jamaah: Jamaah; globalNo: number }>
  kambingPerHal: number; showTitle: boolean; orientation: 'portrait' | 'landscape'
}) {
  const { w, h }  = paperDims(orientation)
  const mPx       = KMB_M * MM_TO_PX
  const cwPx      = (w - 2 * KMB_M) * MM_TO_PX
  const chPx      = (h - 2 * KMB_M) * MM_TO_PX
  const titleHpx  = showTitle ? 20 * MM_TO_PX : 0
  const rowHpx    = (chPx - titleHpx) / kambingPerHal
  const nwPx      = KMB_NO_W * MM_TO_PX
  const B         = '1.5px solid #000'

  return (
    <div style={{ position: 'absolute', inset: mPx }}>
      {showTitle && (
        <div style={{ height: titleHpx, display: 'flex', alignItems: 'flex-end', paddingBottom: 4, marginBottom: 4 }}>
          <span style={{ fontFamily: 'Arial', fontWeight: 700, fontSize: ptToPx(14), color: '#000' }}>
            TIPE C (Penitipan Kambing)
          </span>
        </div>
      )}
      {entries.map(({ jamaah, globalNo }, bi) => (
        <div key={globalNo} style={{ display: 'flex', width: cwPx, height: rowHpx, marginTop: bi > 0 ? -1 : 0 }}>
          <div style={{ width: nwPx, flexShrink: 0, boxSizing: 'border-box',
            border: B, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Arial', fontWeight: 900,
              fontSize: ptToPx(KMB_FONT), color: '#000' }}>{globalNo}</span>
          </div>
          <div style={{ flex: 1, boxSizing: 'border-box',
            borderTop: B, borderBottom: B, borderRight: B,
            display: 'flex', alignItems: 'center', padding: `0 ${5 * MM_TO_PX}px` }}>
            <span style={{ fontFamily: 'Arial', fontWeight: 700,
              fontSize: ptToPx(KMB_FONT), color: '#000', lineHeight: 1.2 }}>
              {jamaah.nama_lengkap}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── PDF helper ────────────────────────────────────────────────────────────
function textVCenter(
  pdf: any, text: string, x: number, cellY: number, cellH: number, fontPt: number, opts?: object
) {
  const y = cellY + cellH / 2 + ptToMm(fontPt) * 0.36
  pdf.text(text, x, y, opts)
}

// ── Main Component ────────────────────────────────────────────────────────
export default function PenyembelihanModal({ data, onClose, onBack }: Props) {
  const [orientation, setOrientation]     = useState<'portrait' | 'landscape'>('landscape')
  const [kambingPerHal, setKambingPerHal] = useState(2)
  const [isGenSapi, setIsGenSapi]         = useState(false)
  const [isGenKmb, setIsGenKmb]           = useState(false)
  const [zoomFactor, setZoomFactor]       = useState(1.0)
  const [previewType, setPreviewType]     = useState<'sapi' | 'kambing'>('sapi')

  const sapiData    = data.filter(d => !isKambing(d.hewan))
  const kambingData = data.filter(d =>  isKambing(d.hewan))
  const kambingFlat = kambingData.flatMap(d => d.jamaah.map(j => ({ hewan: d.hewan, jamaah: j })))

  const { w: paperW, h: paperH } = paperDims(orientation)
  const paperWpx = paperW * MM_TO_PX
  const paperHpx = paperH * MM_TO_PX

  const sapiPages    = sapiData.length
  const kambingPages = Math.ceil(kambingFlat.length / kambingPerHal)
  const totalPages   = sapiPages + kambingPages

  const MAX_DIM    = 560
  const baseScale  = Math.min(MAX_DIM / paperWpx, MAX_DIM / paperHpx, 1)
  const effScale   = baseScale * zoomFactor

  const previewKmb = kambingFlat.slice(0, kambingPerHal).map((e, i) => ({ ...e, globalNo: i + 1 }))

  // ── Download Sapi PDF ─────────────────────────────────────────────────
  async function downloadSapiPDF() {
    if (!sapiData.length) return
    setIsGenSapi(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const dims = [paperW, paperH] as [number, number]  // landscape=[297,210], portrait=[210,297]
      const pdf  = new jsPDF({ unit: 'mm', format: dims })

      sapiData.forEach(({ hewan, jamaah }, idx) => {
        if (idx > 0) pdf.addPage(dims)

        const mx  = SAPI_M, my = SAPI_M
        const cw  = paperW - 2 * SAPI_M
        const ch  = paperH - 2 * SAPI_M
        const rh  = ch / 8
        const nw  = SAPI_NO_W

        // Header
        pdf.setDrawColor(0); pdf.setLineWidth(0.4)
        pdf.rect(mx, my, cw, rh)
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(SAPI_FONT_HEADER); pdf.setTextColor(0)
        textVCenter(pdf, hewan.kode_resi, mx + cw / 2, my, rh, SAPI_FONT_HEADER, { align: 'center' })

        // Baris nama
        jamaah.forEach((j, i) => {
          const ry = my + rh + i * rh
          pdf.setLineWidth(0.4)
          pdf.rect(mx, ry, nw, rh)
          pdf.rect(mx + nw, ry, cw - nw, rh)

          pdf.setFontSize(SAPI_FONT_NO)
          textVCenter(pdf, String(i + 1), mx + nw / 2, ry, rh, SAPI_FONT_NO, { align: 'center' })

          pdf.setFontSize(SAPI_FONT_NAME)
          const nl  = pdf.splitTextToSize(j.nama_lengkap, cw - nw - 8)
          const lh  = ptToMm(SAPI_FONT_NAME) * 1.3
          const th  = nl.length * lh
          const sy  = ry + (rh - th) / 2 + ptToMm(SAPI_FONT_NAME) * 0.75
          nl.slice(0, 2).forEach((line: string, li: number) =>
            pdf.text(line, mx + nw + 5, sy + li * lh))
        })
      })

      pdf.save('sapi-penyembelihan.pdf')
    } finally { setIsGenSapi(false) }
  }

  // ── Download Kambing PDF ──────────────────────────────────────────────
  async function downloadKambingPDF() {
    if (!kambingFlat.length) return
    setIsGenKmb(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const dims    = [paperW, paperH] as [number, number]
      const pdf     = new jsPDF({ unit: 'mm', format: dims })
      const cw      = paperW - 2 * KMB_M
      const nw      = KMB_NO_W
      let   isFirst = true

      for (let i = 0; i < kambingFlat.length; i += kambingPerHal) {
        if (!isFirst) pdf.addPage(dims)
        isFirst = false

        const isFirstPage = i === 0
        const batch = kambingFlat.slice(i, i + kambingPerHal)
        const mx    = KMB_M
        let   curY  = KMB_M

        if (isFirstPage) {
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(0)
          pdf.text('TIPE C (Penitipan Kambing)', mx, curY + 8)
          curY += 14
        }

        const rh = (paperH - KMB_M - curY) / kambingPerHal

        batch.forEach((e, bi) => {
          const no = i + bi + 1
          const ry = curY + bi * rh

          pdf.setDrawColor(0); pdf.setLineWidth(0.4)
          pdf.rect(mx, ry, nw, rh)
          pdf.rect(mx + nw, ry, cw - nw, rh)

          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(KMB_FONT); pdf.setTextColor(0)
          textVCenter(pdf, String(no), mx + nw / 2, ry, rh, KMB_FONT, { align: 'center' })

          const nl  = pdf.splitTextToSize(e.jamaah.nama_lengkap, cw - nw - 8)
          const lh  = ptToMm(KMB_FONT) * 1.3
          const th  = nl.length * lh
          const sy  = ry + (rh - th) / 2 + ptToMm(KMB_FONT) * 0.75
          nl.slice(0, 2).forEach((line: string, li: number) =>
            pdf.text(line, mx + nw + 6, sy + li * lh))
        })
      }

      pdf.save('kambing-penyembelihan.pdf')
    } finally { setIsGenKmb(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">

        {/* Header */}
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

            {/* Orientasi — SATU untuk sapi+kambing */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Orientasi Kertas</p>
              <div className="flex gap-2">
                {(['portrait', 'landscape'] as const).map(o => (
                  <button key={o} onClick={() => setOrientation(o)}
                    className={`flex-1 py-2 text-xs rounded-lg border font-medium transition ${orientation === o ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {o === 'portrait' ? 'Potret' : 'Landscape'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Berlaku untuk sapi &amp; kambing</p>
            </div>

            {/* Info sapi */}
            {sapiData.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sapi</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-600">
                  <p><span className="font-medium">Font:</span> 40pt / 36pt / 26pt</p>
                  <p><span className="font-medium">Margin:</span> 25.4 mm</p>
                  <p><span className="font-medium">Total:</span> {sapiPages} halaman</p>
                </div>
              </div>
            )}

            {/* Settings kambing */}
            {kambingData.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kambing</p>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-600">
                    <p><span className="font-medium">Font:</span> 50pt bold</p>
                    <p><span className="font-medium">Margin:</span> 8.8 mm</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Kambing per halaman</label>
                    <select value={kambingPerHal} onChange={e => setKambingPerHal(+e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} per halaman</option>)}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">{kambingFlat.length} kambing • {kambingPages} halaman</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-600">
                Total: {totalPages} halaman
                {sapiPages > 0 && kambingPages > 0 && (
                  <span className="text-gray-400 font-normal"> ({sapiPages} sapi + {kambingPages} kambing)</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{paperW} × {paperH} mm</p>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-gray-200 p-6 flex flex-col">

            {/* Tab + Zoom */}
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

            {/* Paper */}
            <div className="flex justify-center">
              <div style={{ width: paperWpx * effScale, height: paperHpx * effScale, position: 'relative', flexShrink: 0 }}
                className="shadow-2xl">
                <div style={{
                  width: paperWpx, height: paperHpx,
                  position: 'absolute', top: 0, left: 0,
                  transform: `scale(${effScale})`, transformOrigin: 'top left',
                  background: 'white', overflow: 'hidden',
                }}>
                  {previewType === 'sapi' && sapiData[0] ? (
                    <SapiSheet hewan={sapiData[0].hewan} jamaah={sapiData[0].jamaah} orientation={orientation} />
                  ) : previewType === 'kambing' && previewKmb.length > 0 ? (
                    <KambingSheet entries={previewKmb} kambingPerHal={kambingPerHal} showTitle orientation={orientation} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-400">Tidak ada data</div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center flex-shrink-0">
              {previewType === 'sapi'
                ? `Preview sapi pertama • ${paperW}×${paperH}mm`
                : `Preview hal. 1 kambing • ${paperW}×${paperH}mm`}
            </p>
          </div>
        </div>

        {/* Footer — dua tombol download terpisah, tanpa Print (tidak buka tab baru) */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {sapiData.length > 0 && (
            <button onClick={downloadSapiPDF} disabled={isGenSapi}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">
              <Download size={15} />
              {isGenSapi ? 'Membuat...' : `Download Sapi (${sapiPages} hal)`}
            </button>
          )}
          {kambingFlat.length > 0 && (
            <button onClick={downloadKambingPDF} disabled={isGenKmb}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition">
              <Download size={15} />
              {isGenKmb ? 'Membuat...' : `Download Kambing (${kambingPages} hal)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
