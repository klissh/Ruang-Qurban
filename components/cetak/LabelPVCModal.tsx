'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Printer, Download } from 'lucide-react'
import type { Jamaah, Hewan } from '@/types'

interface LabelData {
  hewan: Hewan
  jamaah: Jamaah[]
}

interface Config {
  lebarMm: number
  tinggiMm: number
  kolomPerBaris: number
}

interface Props {
  data: LabelData[]
  onClose: () => void
}

const DEFAULT_CONFIG: Config = { lebarMm: 85.6, tinggiMm: 53.98, kolomPerBaris: 2 }

// 1mm = 3.7795px pada 96dpi
const MM_TO_PX = 3.7795

function LabelCard({ hewan, jamaah, config }: { hewan: Hewan; jamaah: Jamaah[]; config: Config }) {
  const w = config.lebarMm * MM_TO_PX
  const h = config.tinggiMm * MM_TO_PX
  return (
    <div
      style={{ width: w, height: h, flexShrink: 0 }}
      className="border border-black bg-white flex flex-col p-[6px] font-mono overflow-hidden box-border"
    >
      <div className="font-bold text-[11px] leading-tight border-b border-black pb-[3px] mb-[3px] tracking-wide">
        {hewan.kode_resi}
      </div>
      {jamaah.map((j, idx) => (
        <div key={j.id} className="text-[8px] leading-[1.2] truncate">
          {jamaah.length > 1 ? `${idx + 1}. ` : ''}{j.nama_lengkap}
        </div>
      ))}
      <div className="mt-auto pt-[2px] border-t border-gray-300">
        <div className="text-[8px] leading-[1.2] text-gray-600 truncate">
          {jamaah[0]?.alamat_lengkap ?? '—'}
        </div>
        {jamaah[0]?.no_hp && (
          <div className="text-[8px] text-gray-500">{jamaah[0].no_hp}</div>
        )}
      </div>
    </div>
  )
}

export default function LabelPVCModal({ data, onClose }: Props) {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const previewRef = useRef<HTMLDivElement>(null)

  // Flatten: setiap jamaah punya label sendiri untuk sapi,
  // tiap hewan kambing satu label
  const labels: Array<{ hewan: Hewan; jamaah: Jamaah[] }> = []
  data.forEach(({ hewan, jamaah }) => {
    if (hewan.jenis_hewan === 'SAPI') {
      // Satu label per jamaah (tapi tetap tampilkan semua nama di label yang sama)
      labels.push({ hewan, jamaah })
    } else {
      labels.push({ hewan, jamaah })
    }
  })

  const buildPrintHTML = useCallback(() => {
    const w = config.lebarMm
    const h = config.tinggiMm
    const cols = config.kolomPerBaris

    const labelHTMLs = labels.map(({ hewan, jamaah }) => {
      const names = jamaah
        .map((j, i) => `<div style="font-size:8px;line-height:1.3;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${jamaah.length > 1 ? `${i + 1}. ` : ''}${j.nama_lengkap}</div>`)
        .join('')
      return `
        <div style="width:${w}mm;height:${h}mm;border:1px solid black;padding:2mm;box-sizing:border-box;font-family:monospace;display:flex;flex-direction:column;overflow:hidden;break-inside:avoid">
          <div style="font-weight:bold;font-size:11px;border-bottom:1px solid black;padding-bottom:2px;margin-bottom:2px;letter-spacing:0.5px">${hewan.kode_resi}</div>
          ${names}
          <div style="margin-top:auto;padding-top:2px;border-top:1px solid #ccc">
            <div style="font-size:8px;color:#444;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${jamaah[0]?.alamat_lengkap ?? ''}</div>
            ${jamaah[0]?.no_hp ? `<div style="font-size:8px;color:#666">${jamaah[0].no_hp}</div>` : ''}
          </div>
        </div>`
    }).join('')

    return `<!DOCTYPE html><html><head><style>
      @page { margin: 10mm }
      body { margin: 0; }
      .grid { display: grid; grid-template-columns: repeat(${cols}, ${w}mm); gap: 2mm; }
    </style></head><body><div class="grid">${labelHTMLs}</div></body></html>`
  }, [config, labels])

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildPrintHTML())
    win.document.close()
    win.onload = () => { win.print() }
  }

  function handleDownload() {
    const html = buildPrintHTML()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'label-qurban.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const SCALE = 0.55
  const previewW = config.lebarMm * MM_TO_PX * SCALE
  const previewH = config.tinggiMm * MM_TO_PX * SCALE

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">Cetak Label PVC</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Settings Panel */}
          <div className="w-60 flex-shrink-0 border-r border-gray-100 p-5 space-y-5 overflow-y-auto">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ukuran Label</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Lebar (mm)</label>
                  <input
                    type="number"
                    value={config.lebarMm}
                    onChange={(e) => setConfig((c) => ({ ...c, lebarMm: +e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Tinggi (mm)</label>
                  <input
                    type="number"
                    value={config.tinggiMm}
                    onChange={(e) => setConfig((c) => ({ ...c, tinggiMm: +e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Kolom per baris</label>
                  <select
                    value={config.kolomPerBaris}
                    onChange={(e) => setConfig((c) => ({ ...c, kolomPerBaris: +e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} kolom</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setConfig(DEFAULT_CONFIG)}
                className="mt-3 text-xs text-emerald-600 hover:underline"
              >
                Reset ke default (85.6 × 53.98mm)
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Info</p>
              <p className="text-xs text-gray-400">{labels.length} label akan dicetak</p>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 overflow-auto bg-gray-100 p-6">
            <p className="text-xs text-gray-400 mb-4 text-center">Preview (skala {Math.round(SCALE * 100)}%)</p>
            <div
              ref={previewRef}
              className="flex flex-wrap gap-2 justify-start"
            >
              {labels.map(({ hewan, jamaah }, idx) => (
                <div
                  key={idx}
                  style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', width: config.lebarMm * MM_TO_PX, height: config.tinggiMm * MM_TO_PX, marginRight: -(config.lebarMm * MM_TO_PX * (1 - SCALE)), marginBottom: -(config.tinggiMm * MM_TO_PX * (1 - SCALE)) }}
                >
                  <LabelCard hewan={hewan} jamaah={jamaah} config={config} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Download size={15} />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-medium text-white transition"
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>
    </div>
  )
}
