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

// ─── Download template helper ─────────────────────────────────────────────
function downloadTemplate() {
  const SAPI_B_NAMES = [
    'Widhayat Rudhi Windarta',
    'Muthiah Raihanatul Jannah',
    'Muhammad Muhibuddin Mufqi',
    'Muhammad Muhibuddin Mukhlish',
    'Sopyan Supardi',
    'Nur Fazria Maulidia',
    'Supriyati binti Tamsir',
  ].join('\n')

  const ws = XLSX.utils.aoa_to_sheet([
    ['Tipe', 'Nama Peng-Qurban', 'No HP Pendaftar', 'Alamat Pendaftar', 'Nama Pendaftar'],
    // SAPI-A: 2 jamaah dalam 1 sapi → Nama Pendaftar sama
    ['SAPI-A', 'Ahmad bin Abdullah',    '081234567890', 'Jl. Mawar No. 1 RT.01/08, Pondok Aren', 'Ahmad Fauzi'],
    ['SAPI-A', 'Budi bin Santoso',      '081234567890', 'Jl. Mawar No. 1 RT.01/08, Pondok Aren', 'Ahmad Fauzi'],
    // SAPI-B: 7 nama dalam 1 sel (pisah Enter / Alt+Enter)
    ['SAPI-B', SAPI_B_NAMES,            '085878920436', 'Jl. Cendrawasih A84a RT.04/08',          'Mufqi'],
    // KAMBING: 1 nama per baris
    ['KAMBING', 'Adi Rasidi bin Sanusi', '08156901512', 'Cluster Griya Ilhami Blok B3',            'Adi Rasidi'],
    ['KAMBING', 'Fatimah binti Ahmad',   '082345678901', 'Jl. Bambu No. 39A RT.009/005',           'Fatimah'],
  ])

  ws['!cols'] = [
    { wch: 10 }, { wch: 50 }, { wch: 20 }, { wch: 42 }, { wch: 25 },
  ]
  // Aktifkan wrap-text pada sel SAPI-B agar multi-line kelihatan
  if (ws['B4']) ws['B4'].s = { alignment: { wrapText: true } }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template Qurban')
  XLSX.writeFile(wb, 'template_import_qurban.xlsx')
}

// ─── Komponen utama ──────────────────────────────────────────────────────
export default function ImportModal({ onClose, onSuccess }: Props) {
  const [tab,             setTab]             = useState<'new' | 'gforms'>('new')
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

          {/* ── Section 1: Panduan Template ── */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>

            {/* Tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={12} color="rgba(255,255,255,0.28)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Panduan Format
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['new', 'gforms'] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: '4px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    background: tab === t ? 'rgba(16,185,129,0.14)' : 'transparent',
                    color:  tab === t ? '#34d399' : 'rgba(255,255,255,0.35)',
                    border: tab === t ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {t === 'new' ? 'Template Baru' : 'Google Forms'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: '14px 16px' }}>

              {tab === 'new' ? (
                <>
                  {/* Tabel contoh */}
                  <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr>
                          {['Tipe', 'Nama Peng-Qurban', 'No HP Pendaftar', 'Alamat Pendaftar', 'Nama Pendaftar'].map((h) => (
                            <th key={h} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.07)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          { tipe: 'SAPI-A',  nama: 'Ahmad bin Abdullah',       hp: '0812...',  alamat: 'Jl. Mawar No.1',     pend: 'Ahmad Fauzi' },
                          { tipe: 'SAPI-A',  nama: 'Budi bin Santoso',         hp: '0812...',  alamat: 'Jl. Mawar No.1',     pend: 'Ahmad Fauzi' },
                          { tipe: 'SAPI-B',  nama: '7 nama\n(dipisah Enter)',  hp: '0819...',  alamat: 'Jl. Cendrawasih 84', pend: 'Mufqi'       },
                          { tipe: 'KAMBING', nama: 'Fatimah binti Ahmad',       hp: '0823...',  alamat: 'Jl. Bambu No.39A',   pend: 'Fatimah'     },
                        ] as const).map((r, i) => {
                          const tc = TC[r.tipe]
                          const isB = r.tipe === 'SAPI-B'
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                              <td style={{ padding: '5px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                                  {r.tipe}
                                </span>
                              </td>
                              <td style={{ padding: '5px 10px', border: '1px solid rgba(255,255,255,0.06)', color: isB ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.55)', fontSize: 11, whiteSpace: 'pre-line', fontStyle: isB ? 'italic' : 'normal' }}>
                                {r.nama}
                              </td>
                              {[r.hp, r.alamat, r.pend].map((v, j) => (
                                <td key={j} style={{ padding: '5px 10px', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                                  {v}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Catatan penting */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {[
                      { tipe: 'SAPI-A' as const, note: 'Tulis 1 nama per baris. Baris dengan Nama Pendaftar yang sama otomatis digabung menjadi 1 sapi (maks. 7 orang).' },
                      { tipe: 'SAPI-B' as const, note: 'Tulis semua nama dalam 1 sel, pisahkan dengan Enter (Alt+Enter di Excel). Maks. 7 orang per sel.' },
                    ].map(({ tipe, note }) => {
                      const tc = TC[tipe]
                      return (
                        <div key={tipe} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                            {tipe}
                          </span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>
                            {note}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Tombol download */}
                  <button
                    onClick={downloadTemplate}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', transition: 'background 0.15s' }}
                  >
                    <Download size={13} /> Download Template (.xlsx)
                  </button>
                </>
              ) : (
                /* ── Tab Google Forms ── */
                <>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, margin: '0 0 12px' }}>
                    Upload langsung file <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Excel dari export Google Forms</strong> Pendaftaran Qurban.
                    Sistem otomatis mendeteksi kolom berikut:
                  </p>

                  {[
                    { tipe: 'SAPI-A',  col: 'Nama Peng-Qurban TIPE A (Rp3,5 Juta per 1/7 sapi)' },
                    { tipe: 'SAPI-B',  col: 'Nama Peng-Qurban TIPE B (Penitipan Sapi)' },
                    { tipe: 'KAMBING', col: 'Nama Peng-Qurban TIPE C (Penitipan Kambing)' },
                  ].map(({ tipe, col }) => {
                    const tc = TC[tipe as keyof typeof TC]
                    return (
                      <div key={tipe} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {tipe}
                        </span>
                        <code style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', fontFamily: 'ui-monospace,monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5, lineHeight: 1.5 }}>
                          {col}
                        </code>
                      </div>
                    )
                  })}

                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 10 }}>
                    <p style={{ fontSize: 11.5, color: 'rgba(147,197,253,0.75)', margin: 0, lineHeight: 1.6 }}>
                      <strong>Logika pengelompokan otomatis:</strong> pendaftar dengan nama + nomor HP yang identik pada TIPE A
                      akan dikelompokkan ke satu sapi. TIPE B dengan beberapa nama dalam satu sel dipisahkan otomatis per baris.
                    </p>
                  </div>
                </>
              )}
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
