'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  X, Upload, Download, FileSpreadsheet, CheckCircle2,
  AlertTriangle, Beef, PawPrint, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { detectAndParse } from '@/lib/importParser'
import type { ParseResult } from '@/lib/importParser'

interface Props {
  onClose  : () => void
  onSuccess: () => void
}

// ─── Warna per tipe ──────────────────────────────────────────────────────
const TC = {
  'SAPI-A': { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.30)',  color: '#34d399' },
  'SAPI-B': { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.30)',  color: '#60a5fa' },
  'KAMBING': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)',  color: '#fbbf24' },
} as const

// ─── Shared style tokens ──────────────────────────────────────────────────
const MODAL: React.CSSProperties = {
  background: 'rgba(7,18,11,0.97)',
  backdropFilter: 'blur(36px) saturate(150%)',
  WebkitBackdropFilter: 'blur(36px) saturate(150%)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderTop: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 24,
  width: '100%',
  maxWidth: 660,
  maxHeight: '92vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 32px 80px rgba(0,0,0,0.56)',
}

// ─── Download template helper (format persis Google Forms export) ─────────
function downloadTemplate() {
  const SAPI_B_NAMES = [
    'Dummy Nama Satu bin Contoh',
    'Dummy Nama Dua binti Contoh',
    'Dummy Nama Tiga bin Contoh',
    'Dummy Nama Empat binti Contoh',
    'Dummy Nama Lima bin Contoh',
    'Dummy Nama Enam binti Contoh',
    'Dummy Nama Tujuh bin Contoh',
  ].join('\n')

  const headers = [
    'Timestamp',
    'Nama pendaftar',
    'Alamat lengkap',
    'Nomor HP pendaftar',
    'ABS',
    'Nama Peng-Qurban TIPE A (Rp3,5 Juta per 1/7 sapi)',
    'Nama Peng-Qurban TIPE B (Penitipan Sapi)',
    'Nama Peng-Qurban TIPE C (Penitipan Kambing)',
    'Notes',
  ]

  const rows = [
    // SAPI-A individu biasa
    ['2026-01-01 08:00:00', 'Pendaftar A', 'Jl. Contoh No. 1 RT.01/01, Kel. Contoh, Kec. Contoh', '081100000001', '', 'Nama Peng-Qurban A bin Contoh', '', '', ''],
    ['2026-01-02 09:00:00', 'Pendaftar B', 'Jl. Contoh No. 2 RT.02/01, Kel. Contoh, Kec. Contoh', '081100000002', '', 'Nama Peng-Qurban B binti Contoh', '', '', ''],
    // SAPI-A multi-nama dalam 1 sel (format angka inline)
    ['2026-01-03 10:00:00', 'Pendaftar C', 'Jl. Contoh No. 3 RT.03/01, Kel. Contoh, Kec. Contoh', '081100000003', '', '1) Nama Peng-Qurban C bin Contoh 2) Nama Peng-Qurban D binti Contoh', '', '', ''],
    // SAPI-B penitipan (7 nama dalam 1 sel, pisah Enter)
    ['2026-01-04 11:00:00', 'Pendaftar D', 'Jl. Contoh No. 4 RT.04/01, Kel. Contoh, Kec. Contoh', '081100000004', '', '', SAPI_B_NAMES, '', ''],
    // KAMBING
    ['2026-01-05 12:00:00', 'Pendaftar E', 'Jl. Contoh No. 5 RT.05/01, Kel. Contoh, Kec. Contoh', '081100000005', '', '', '', 'Nama Peng-Qurban E bin Contoh', ''],
    ['2026-01-06 13:00:00', 'Pendaftar F', 'Jl. Contoh No. 6 RT.06/01, Kel. Contoh, Kec. Contoh', '081100000006', '', '', '', 'Nama Peng-Qurban F binti Contoh', ''],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  ws['!cols'] = [
    { wch: 20 }, // Timestamp
    { wch: 18 }, // Nama pendaftar
    { wch: 40 }, // Alamat lengkap
    { wch: 20 }, // Nomor HP
    { wch: 8  }, // ABS
    { wch: 40 }, // TIPE A
    { wch: 40 }, // TIPE B
    { wch: 36 }, // TIPE C
    { wch: 14 }, // Notes
  ]

  if (ws['G5']) ws['G5'].s = { alignment: { wrapText: true } }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Form Responses 1')
  XLSX.writeFile(wb, 'template_pendaftaran_qurban.xlsx')
}


export default function ImportModal({ onClose, onSuccess }: Props) {
  const [parseResult,     setParseResult]     = useState<ParseResult | null>(null)
  const [fileName,        setFileName]        = useState<string | null>(null)
  const [importing,       setImporting]       = useState(false)
  const [showAll,         setShowAll]         = useState(false)
  const [isDragging,      setIsDragging]      = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Parse file yang dipilih ─────────────────────────────────────────
  function processFile(file: File) {
    setFileName(file.name)
    setParseResult(null)
    setShowAll(false)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target?.result, { type: 'binary' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })
        setParseResult(detectAndParse(rows))
      } catch {
        toast.error('Gagal membaca file. Pastikan format .xlsx atau .csv yang valid.')
      }
    }
    reader.readAsBinaryString(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) processFile(f)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  // ── Import ke API ───────────────────────────────────────────────────
  async function handleImport() {
    if (!parseResult || parseResult.kelompokList.length === 0) return
    setImporting(true)
    try {
      const res  = await fetch('/api/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ kelompokList: parseResult.kelompokList }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`${data.imported} kelompok berhasil diimport!`)
      if (data.errors?.length > 0) {
        data.errors.forEach((err: string) =>
          toast.warning(err, { duration: 7000 })
        )
      }

      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal import data')
    } finally {
      setImporting(false)
    }
  }

  // ── Derived counts ──────────────────────────────────────────────────
  const total     = parseResult?.kelompokList.length ?? 0
  const cntA      = parseResult?.kelompokList.filter((k) => k.tipe === 'SAPI-A').length  ?? 0
  const cntB      = parseResult?.kelompokList.filter((k) => k.tipe === 'SAPI-B').length  ?? 0
  const cntKmb    = parseResult?.kelompokList.filter((k) => k.tipe === 'KAMBING').length ?? 0
  const hasData   = total > 0
  const PREVIEW_N = 8
  const previewItems = showAll
    ? (parseResult?.kelompokList ?? [])
    : (parseResult?.kelompokList.slice(0, PREVIEW_N) ?? [])

  // ── Render ──────────────────────────────────────────────────────────
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={MODAL}>

        {/* ══════════ HEADER ══════════ */}
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
                Import Data dari Excel / CSV
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.34)', margin: '4px 0 0' }}>
                Upload file sesuai template — data qurban ditambahkan secara massal
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ══════════ BODY ══════════ */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Section 1: Panduan Format ── */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={12} color="rgba(255,255,255,0.28)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Panduan Format
                </span>
              </div>
              <button
                onClick={downloadTemplate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <Download size={12} /> Download Template
              </button>
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Tabel preview — horizontal scroll */}
              <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 10.5, whiteSpace: 'nowrap', width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {[
                        'Timestamp',
                        'Nama pendaftar',
                        'Alamat lengkap',
                        'Nomor HP pendaftar',
                        'ABS',
                        <>Nama Peng-Qurban<br/><span style={{ color: TC['SAPI-A'].color }}>TIPE A</span><br/><span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>(Rp3,5 Juta per 1/7 sapi)</span></>,
                        <>Nama Peng-Qurban<br/><span style={{ color: TC['SAPI-B'].color }}>TIPE B</span><br/><span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>(Penitipan Sapi)</span></>,
                        <>Nama Peng-Qurban<br/><span style={{ color: TC['KAMBING'].color }}>TIPE C</span><br/><span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>(Penitipan Kambing)</span></>,
                        'Notes',
                      ].map((h, i) => (
                        <th key={i} style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.55)', fontWeight: 700, textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.4, verticalAlign: 'bottom' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      {
                        ts: '2026-01-01 08:00:00', pend: 'Pendaftar A',
                        alamat: 'Jl. Contoh No. 1 RT.01/01…', hp: '081100000001', abs: 'wa.me/…',
                        a: 'Nama Peng-Qurban A bin Contoh', b: '', c: '', notes: '',
                      },
                      {
                        ts: '2026-01-04 11:00:00', pend: 'Pendaftar D',
                        alamat: 'Jl. Contoh No. 4 RT.04/01…', hp: '081100000004', abs: 'wa.me/…',
                        a: '', b: 'Dummy Nama Satu\nDummy Nama Dua\n… (7 nama)', c: '', notes: '',
                      },
                      {
                        ts: '2026-01-03 10:00:00', pend: 'Pendaftar C',
                        alamat: 'Jl. Contoh No. 3 RT.03/01…', hp: '081100000003', abs: 'wa.me/…',
                        a: '1) Nama Peng-Qurban C 2) Nama Peng-Qurban D', b: '', c: '', notes: '',
                      },
                      {
                        ts: '2026-01-05 12:00:00', pend: 'Pendaftar E',
                        alamat: 'Jl. Contoh No. 5 RT.05/01…', hp: '081100000005', abs: 'wa.me/…',
                        a: '', b: '', c: 'Nama Peng-Qurban E bin Contoh', notes: '',
                      },
                    ] as const).map((r, i) => {
                      const isB = !!r.b
                      const isC = !!r.c
                      const isA2 = r.a.startsWith('1)')
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.28)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>{r.ts}</td>
                          <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.55)', borderRight: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>{r.pend}</td>
                          <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.32)', borderRight: '1px solid rgba(255,255,255,0.05)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.alamat}</td>
                          <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.38)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>{r.hp}</td>
                          <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.22)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>{r.abs}</td>
                          <td style={{ padding: '5px 10px', borderRight: '1px solid rgba(255,255,255,0.05)', color: r.a ? (isA2 ? TC['SAPI-A'].color : 'rgba(255,255,255,0.55)') : 'transparent', fontStyle: isA2 ? 'italic' : 'normal', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.a || '—'}
                          </td>
                          <td style={{ padding: '5px 10px', borderRight: '1px solid rgba(255,255,255,0.05)', color: isB ? TC['SAPI-B'].color : 'rgba(255,255,255,0.18)', whiteSpace: 'pre-line', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.b || '—'}
                          </td>
                          <td style={{ padding: '5px 10px', borderRight: '1px solid rgba(255,255,255,0.05)', color: isC ? TC['KAMBING'].color : 'rgba(255,255,255,0.18)' }}>
                            {r.c || '—'}
                          </td>
                          <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.2)' }}>{r.notes || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Keterangan per tipe */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {([
                  {
                    tipe: 'SAPI-A' as const,
                    note: 'Tiap baris = 1 orang. Jika ada beberapa nama dalam 1 sel, tulis dengan angka: "1) Nama 2) Nama". Semua individu dikumpul lalu diisi 7 orang/sapi.',
                  },
                  {
                    tipe: 'SAPI-B' as const,
                    note: 'Semua nama dalam 1 sel, pisahkan dengan Enter (Alt+Enter di Excel). Maks. 7 orang per sel — langsung jadi 1 sapi.',
                  },
                  {
                    tipe: 'KAMBING' as const,
                    note: '1 baris = 1 kambing.',
                  },
                ]).map(({ tipe, note }) => {
                  const tc = TC[tipe]
                  return (
                    <div key={tipe} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                        {tipe}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
                        {note}
                      </span>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>

          {/* ── Section 2: Drop zone ── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'rgba(16,185,129,0.55)' : parseResult ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 16,
              background:   isDragging ? 'rgba(16,185,129,0.07)' : parseResult ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)',
              padding:      '28px 20px',
              cursor:       'pointer',
              textAlign:    'center',
              transition:   'all 0.2s',
            }}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileChange} />

            {parseResult ? (
              <>
                <CheckCircle2 size={28} color="#34d399" style={{ margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#34d399', margin: '0 0 3px' }}>{fileName}</p>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Klik untuk ganti file</p>
              </>
            ) : (
              <>
                <Upload size={28} color={isDragging ? '#34d399' : 'rgba(255,255,255,0.2)'} style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 13.5, fontWeight: 600, color: isDragging ? '#34d399' : 'rgba(255,255,255,0.48)', margin: '0 0 5px' }}>
                  {isDragging ? 'Lepaskan file di sini' : 'Drag & drop atau klik untuk pilih file'}
                </p>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                  Mendukung .xlsx · .xls · .csv
                </p>
              </>
            )}
          </div>

          {/* ── Section 3: Preview hasil parse ── */}
          {parseResult && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>

              {/* Summary chips */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {[
                    { label: `${cntA} Sapi A`,     tipe: 'SAPI-A'  as const, icon: <Beef size={11} />   },
                    { label: `${cntB} Sapi B`,     tipe: 'SAPI-B'  as const, icon: <Beef size={11} />   },
                    { label: `${cntKmb} Kambing`,  tipe: 'KAMBING' as const, icon: <PawPrint size={11} /> },
                  ].map(({ label, tipe, icon }) => {
                    const tc = TC[tipe]
                    return (
                      <div key={tipe} style={{ display: 'flex', alignItems: 'center', gap: 5, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                        {icon} {label}
                      </div>
                    )
                  })}
                </div>
                {(parseResult.skippedRows > 0) && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
                    {parseResult.skippedRows} baris dilewati
                  </span>
                )}
              </div>

              {/* Format tidak dikenali */}
              {parseResult.format === 'unknown' && (
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <AlertTriangle size={24} color="#f87171" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>
                    Format tidak dikenali. Gunakan template yang tersedia atau file export Google Forms.
                  </p>
                </div>
              )}

              {/* Error list */}
              {parseResult.errors.length > 0 && (
                <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(248,113,113,0.04)' }}>
                  {parseResult.errors.map((err, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: i < parseResult.errors.length - 1 ? 5 : 0 }}>
                      <AlertTriangle size={12} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 11, color: '#f87171', lineHeight: 1.5 }}>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Daftar kelompok */}
              {total > 0 && (
                <>
                  {previewItems.map((k, i) => {
                    const tc         = TC[k.tipe]
                    const isSapi     = k.tipe !== 'KAMBING'
                    const namaList   = k.jamaahList.map((j) => j.nama_lengkap).join(', ')
                    const isLast     = i === previewItems.length - 1 && (showAll || total <= PREVIEW_N)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: isLast ? undefined : '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <span style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                            {k.tipe}
                          </span>
                        </div>
                        {isSapi
                          ? <Beef size={13} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
                          : <PawPrint size={13} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.82)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {namaList}
                          </p>
                          {k.pendaftarHp && (
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                              {k.pendaftarHp}
                            </p>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', flexShrink: 0, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                          {k.jamaahList.length} orang
                        </span>
                      </div>
                    )
                  })}

                  {total > PREVIEW_N && (
                    <button
                      onClick={() => setShowAll((v) => !v)}
                      style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.32)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      {showAll
                        ? <><ChevronUp size={13} /> Sembunyikan</>
                        : <><ChevronDown size={13} /> Lihat semua {total} kelompok</>
                      }
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ══════════ FOOTER ══════════ */}
        <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={!hasData || importing}
            style={{
              flex: 2, padding: 11, borderRadius: 12, fontSize: 13.5, fontWeight: 700, cursor: hasData && !importing ? 'pointer' : 'not-allowed',
              background: hasData ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)',
              border: 'none',
              color:  hasData ? 'white' : 'rgba(255,255,255,0.2)',
              boxShadow: hasData ? '0 4px 18px rgba(16,185,129,0.32)' : 'none',
              opacity: importing ? 0.65 : 1,
              transition: 'all 0.2s',
            }}
          >
            {importing
              ? 'Mengimport...'
              : hasData
                ? `Import ${total} Kelompok`
                : 'Pilih File Terlebih Dahulu'
            }
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
