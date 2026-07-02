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

// Deteksi jenis hewan dari kode
function isKambing(hewan: Hewan) {
  return hewan.kode_resi.toUpperCase().startsWith('KMB')
}

export default function PenyembelihanModal({ data, onClose, onBack }: Props) {
  const [paperKey, setPaperKey]           = useState<PaperKey>('A4')
  const [orientation, setOrientation]     = useState<'portrait' | 'landscape'>('portrait')
  const [sapiPerHal, setSapiPerHal]       = useState(1)   // biasanya 1 sapi = 1 hal
  const [kambingPerHal, setKambingPerHal] = useState(2)   // 2 kambing per halaman (sesuai docx)
  const [isGenerating, setIsGenerating]   = useState(false)
  const [zoomFactor, setZoomFactor]       = useState(1.0)
  const [previewType, setPreviewType]     = useState<'sapi' | 'kambing'>('sapi')

  const paperW = orientation === 'portrait' ? PAPER_SIZES[paperKey].w : PAPER_SIZES[paperKey].h
  const paperH = orientation === 'portrait' ? PAPER_SIZES[paperKey].h : PAPER_SIZES[paperKey].w
  const paperWpx = paperW * MM_TO_PX
  const paperHpx = paperH * MM_TO_PX

  // Pisah sapi dan kambing
  const sapiData    = data.filter(d => !isKambing(d.hewan))
  const kambingData = data.filter(d => isKambing(d.hewan))

  // Flat list kambing (setiap kambing punya 1 jamaah)
  const kambingFlat = kambingData.flatMap(d => d.jamaah.map(j => ({ hewan: d.hewan, jamaah: j })))

  const sapiPages    = sapiData.length
  const kambingPages = Math.ceil(kambingFlat.length / kambingPerHal)
  const totalPages   = sapiPages + kambingPages

  const MAX_W = 500, MAX_H = 660
  const previewScale  = Math.min(MAX_W / paperWpx, MAX_H / paperHpx, 1)
  const effectiveScale = previewScale * zoomFactor

  const marginMm = 15

  // ── Preview components ─────────────────────────────────────────────────────

  // Preview satu lembar sapi
  const SapiSheet = ({ hewan, jamaah }: { hewan: Hewan; jamaah: Jamaah[] }) => {
    const mPx = marginMm * MM_TO_PX
    const headerH = 42
    const rowH    = Math.max(36, Math.floor((paperHpx - mPx * 2 - headerH) / Math.max(jamaah.length, 1)))
    return (
      <div style={{ position: 'absolute', inset: mPx, display: 'flex', flexDirection: 'column' }}>
        <div style={{ border: '3px solid #111', overflow: 'hidden' }}>
          {/* Kode hewan */}
          <div style={{ background: '#111', color: '#fff', textAlign: 'center', padding: '8px 12px' }}>
            <p style={{ fontWeight: 900, fontSize: 32, letterSpacing: 4, margin: 0, fontFamily: 'monospace' }}>
              {hewan.kode_resi}
            </p>
            <p style={{ fontSize: 12, margin: '3px 0 0', opacity: 0.75 }}>{hewan.jenis_hewan}</p>
          </div>
          {/* Daftar nama */}
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {jamaah.map((j, i) => (
                <tr key={j.id}>
                  <td style={{ border: '2px solid #111', padding: '6px 10px', fontWeight: 700, fontSize: 15, textAlign: 'center', width: 44, color: '#111' }}>{i + 1}</td>
                  <td style={{ border: '2px solid #111', padding: '6px 10px', fontWeight: 700, fontSize: 15, color: '#111' }}>{j.nama_lengkap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Preview satu halaman kambing (2 entri per halaman)
  const KambingSheet = ({ entries }: { entries: Array<{ hewan: Hewan; jamaah: Jamaah; globalNo: number }> }) => {
    const mPx = marginMm * MM_TO_PX
    const rowH = Math.floor((paperHpx - mPx * 2 - 40) / kambingPerHal)
    return (
      <div style={{ position: 'absolute', inset: mPx, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header section */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: 6, marginBottom: 4 }}>
          <p style={{ fontWeight: 700, fontSize: 13, margin: 0, letterSpacing: 1, color: '#111' }}>
            TIPE C — KAMBING QURBAN
          </p>
        </div>
        {/* Baris kambing */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(({ hewan, jamaah, globalNo }) => (
            <div key={globalNo} style={{ flex: 1, border: '2px solid #111', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              {/* Nomor urut */}
              <div style={{ background: '#f3f4f6', borderRight: '2px solid #111', width: 52, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 900, fontSize: 22, color: '#111' }}>{globalNo}</span>
              </div>
              {/* Kode + nama */}
              <div style={{ padding: '8px 14px', flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 12, margin: 0, color: '#6b7280', fontFamily: 'monospace', letterSpacing: 1 }}>
                  {hewan.kode_resi}
                </p>
                <p style={{ fontWeight: 700, fontSize: 17, margin: '3px 0 0', color: '#111', lineHeight: 1.25 }}>
                  {jamaah.nama_lengkap}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Preview selection ──────────────────────────────────────────────────────
  const previewSapi    = sapiData[0]
  const previewKambing = kambingFlat.slice(0, kambingPerHal).map((e, i) => ({ ...e, globalNo: i + 1 }))

  // ── Build print HTML ───────────────────────────────────────────────────────
  function buildPrintHTML() {
    const pages: string[] = []

    // Halaman sapi
    sapiData.forEach(({ hewan, jamaah }) => {
      const rows = jamaah.map((j, i) => `
        <tr>
          <td style="border:2.5px solid #111;padding:7px 12px;font-weight:700;font-size:16px;text-align:center;width:44px;color:#111">${i + 1}</td>
          <td style="border:2.5px solid #111;padding:7px 12px;font-weight:700;font-size:16px;color:#111">${j.nama_lengkap}</td>
        </tr>`).join('')
      pages.push(`
        <div style="width:${paperW}mm;height:${paperH}mm;box-sizing:border-box;padding:${marginMm}mm;page-break-after:always;display:flex;flex-direction:column;justify-content:center">
          <div style="border:3px solid #111">
            <div style="background:#111;color:#fff;text-align:center;padding:10px 14px">
              <p style="font-weight:900;font-size:32px;letter-spacing:5px;margin:0;font-family:monospace">${hewan.kode_resi}</p>
              <p style="font-size:11px;margin:3px 0 0;opacity:.75">${hewan.jenis_hewan}</p>
            </div>
            <table style="border-collapse:collapse;width:100%"><tbody>${rows}</tbody></table>
          </div>
        </div>`)
    })

    // Halaman kambing (2 per halaman)
    for (let i = 0; i < kambingFlat.length; i += kambingPerHal) {
      const batch = kambingFlat.slice(i, i + kambingPerHal)
      const rowH = Math.floor((297 - 2 * marginMm - 22) / kambingPerHal)  // estimasi A4

      const rows = batch.map((e, bi) => {
        const no = i + bi + 1
        return `
          <div style="flex:1;border:2px solid #111;display:flex;align-items:center;overflow:hidden">
            <div style="background:#f3f4f6;border-right:2px solid #111;width:56px;align-self:stretch;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-weight:900;font-size:26px;color:#111">${no}</span>
            </div>
            <div style="padding:10px 16px;flex:1">
              <p style="font-weight:700;font-size:12px;margin:0;color:#6b7280;font-family:monospace;letter-spacing:1px">${e.hewan.kode_resi}</p>
              <p style="font-weight:700;font-size:20px;margin:4px 0 0;color:#111;line-height:1.2">${e.jamaah.nama_lengkap}</p>
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
      let isFirst = true

      // ── Halaman sapi ────────────────────────────────────────────────────
      sapiData.forEach(({ hewan, jamaah }) => {
        if (!isFirst) pdf.addPage()
        isFirst = false

        const headerH = 20
        const rowH    = Math.min(12, Math.floor((paperH - 2 * my - headerH) / Math.max(jamaah.length, 1)))
        const tableH  = jamaah.length * rowH
        const startY  = (paperH - headerH - tableH) / 2

        // Kotak hitam header
        pdf.setFillColor(17, 24, 39)
        pdf.rect(mx, startY, cw, headerH, 'F')
        pdf.setFont('courier', 'bold'); pdf.setFontSize(22); pdf.setTextColor(255)
        pdf.text(hewan.kode_resi, paperW / 2, startY + 12, { align: 'center', charSpace: 3 })
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(200)
        pdf.text(hewan.jenis_hewan, paperW / 2, startY + 17.5, { align: 'center' })

        // Baris nama
        pdf.setTextColor(0)
        jamaah.forEach((j, i) => {
          const ry = startY + headerH + i * rowH
          pdf.setDrawColor(17, 24, 39); pdf.setLineWidth(0.4)
          pdf.rect(mx, ry, 14, rowH)
          pdf.rect(mx + 14, ry, cw - 14, rowH)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
          pdf.text(String(i + 1), mx + 7, ry + rowH * 0.65, { align: 'center' })
          pdf.text(j.nama_lengkap.slice(0, 50), mx + 16, ry + rowH * 0.65)
        })
        pdf.setDrawColor(0)
      })

      // ── Halaman kambing ─────────────────────────────────────────────────
      const kambingRowH = Math.floor((paperH - 2 * my - 14) / kambingPerHal) - 4

      for (let i = 0; i < kambingFlat.length; i += kambingPerHal) {
        if (!isFirst) pdf.addPage()
        isFirst = false

        const batch = kambingFlat.slice(i, i + kambingPerHal)

        // Header seksi
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(0)
        pdf.text('TIPE C — KAMBING QURBAN', paperW / 2, my + 5, { align: 'center' })
        pdf.setLineWidth(0.5); pdf.line(mx, my + 8, paperW - mx, my + 8)

        let curY = my + 14

        batch.forEach((e, bi) => {
          const no = i + bi + 1
          const boxH = kambingRowH

          // Border kotak
          pdf.setDrawColor(17, 24, 39); pdf.setLineWidth(0.4)
          pdf.rect(mx, curY, cw, boxH)

          // Kolom nomor (background abu)
          pdf.setFillColor(243, 244, 246)
          pdf.rect(mx, curY, 16, boxH, 'F')
          pdf.setLineWidth(0.4)
          pdf.line(mx + 16, curY, mx + 16, curY + boxH)

          // Nomor urut
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20); pdf.setTextColor(17)
          pdf.text(String(no), mx + 8, curY + boxH * 0.62, { align: 'center' })

          // Kode kambing
          pdf.setFont('courier', 'bold'); pdf.setFontSize(9); pdf.setTextColor(107)
          pdf.text(e.hewan.kode_resi, mx + 19, curY + 8)

          // Nama
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(0)
          const nameLines = pdf.splitTextToSize(e.jamaah.nama_lengkap, cw - 22)
          nameLines.slice(0, 2).forEach((line: string, li: number) => {
            pdf.text(line, mx + 19, curY + 15 + li * 7)
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

        {/* Header modal */}
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

            {sapiData.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sapi</p>
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

          {/* ── Preview ───────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-auto bg-gray-200 p-6 flex flex-col">

            {/* Tab sapi/kambing + zoom */}
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

            {/* Paper preview */}
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
              Preview halaman pertama •{' '}
              {previewType === 'sapi'
                ? `${sapiData.length} hal sapi`
                : `${kambingPages} hal kambing (${kambingFlat.length} entri, ${kambingPerHal}/hal)`}
            </p>
          </div>
        </div>

        {/* Footer */}
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
