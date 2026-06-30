'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, ShieldCheck, UserCog, Wrench, X } from 'lucide-react'
import { formatTanggalPendek } from '@/lib/utils'
import type { Role } from '@/types'

interface PanitiaRow {
  id: string
  nama_lengkap: string
  role: Role
  created_at: string
}

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_PENDAFTARAN: 'Admin Pendaftaran',
  PETUGAS_LAPANGAN: 'Petugas Lapangan',
}

const ROLE_STYLE: Record<Role, { bg: string; color: string; border: string; Icon: React.ElementType }> = {
  SUPER_ADMIN:       { bg: 'rgba(167,139,250,0.13)', color: '#c4b5fd', border: 'rgba(167,139,250,0.22)', Icon: ShieldCheck },
  ADMIN_PENDAFTARAN: { bg: 'rgba(96,165,250,0.13)',  color: '#60a5fa', border: 'rgba(96,165,250,0.22)',  Icon: UserCog },
  PETUGAS_LAPANGAN:  { bg: 'rgba(251,191,36,0.13)',  color: '#fbbf24', border: 'rgba(251,191,36,0.22)',  Icon: Wrench },
}

const G = {
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderTop: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '1.125rem',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
  } as React.CSSProperties,
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    color: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13.5,
    outline: 'none',
  } as React.CSSProperties,
  modal: {
    background: 'rgba(7,18,11,0.97)',
    backdropFilter: 'blur(36px) saturate(150%)',
    WebkitBackdropFilter: 'blur(36px) saturate(150%)',
    border: '1px solid rgba(255,255,255,0.11)',
    borderTop: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 32px 80px rgba(0,0,0,0.52)',
  } as React.CSSProperties,
}

interface Props {
  panitiaList: PanitiaRow[]
  currentUserId: string
  workspaceId: string
}

export default function PanitiaClient({ panitiaList, currentUserId, workspaceId }: Props) {
  const [list, setList] = useState<PanitiaRow[]>(panitiaList)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nama_lengkap: '', email: '', password: '', role: 'ADMIN_PENDAFTARAN' as Role })
  const [saving, setSaving] = useState(false)

  async function handleInvite() {
    if (!form.nama_lengkap || !form.email || !form.password) {
      toast.error('Semua field wajib diisi')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/panitia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workspace_id: workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setList((p) => [...p, data.profile])
      setShowModal(false)
      setForm({ nama_lengkap: '', email: '', password: '', role: 'ADMIN_PENDAFTARAN' })
      toast.success(`${form.nama_lengkap} berhasil ditambahkan`)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menambahkan panitia')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-slide-up">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>
            Manajemen Panitia
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>
            {list.length} anggota terdaftar
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px',
            background: 'linear-gradient(135deg,#10b981,#059669)',
            border: 'none', borderRadius: 11, color: 'white',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(16,185,129,0.38), 0 0 0 1px rgba(16,185,129,0.15)',
          }}
        >
          <UserPlus size={15} /> Tambah Panitia
        </button>
      </div>

      {/* List */}
      <div style={G.card}>
        {list.length === 0 && (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Belum ada anggota panitia</p>
          </div>
        )}
        {list.map((p, idx) => {
          const rs = ROLE_STYLE[p.role]
          const RoleIcon = rs.Icon
          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 22px',
                borderBottom: idx < list.length - 1 ? '1px solid rgba(255,255,255,0.045)' : 'none',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: rs.bg, color: rs.color,
                border: `1px solid ${rs.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>
                {p.nama_lengkap.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>
                  {p.nama_lengkap}
                </p>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)', marginTop: 3 }}>
                  Bergabung {formatTanggalPendek(p.created_at)}
                </p>
              </div>

              {/* Role badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`,
                fontSize: 10.5, fontWeight: 700,
              }}>
                <RoleIcon size={11} />
                {ROLE_LABEL[p.role]}
              </div>

              {p.id !== currentUserId && (
                <button
                  style={{ background: 'none', border: 'none', padding: 7, cursor: 'pointer', color: 'rgba(255,255,255,0.18)', borderRadius: 8, display: 'flex', alignItems: 'center' }}
                  title="Hapus panitia"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={G.modal}>
            {/* Header */}
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0, letterSpacing: '-0.2px' }}>
                Tambah Anggota Panitia
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}>
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { field: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', placeholder: 'Ahmad Fauzi' },
                { field: 'email', label: 'Email Login', type: 'email', placeholder: 'ahmad@masjid.com' },
                { field: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter' },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={(form as any)[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    style={G.input}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
                  Role / Jabatan
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  style={{ ...G.input, appearance: 'none' }}
                >
                  <option value="ADMIN_PENDAFTARAN">Admin Pendaftaran</option>
                  <option value="PETUGAS_LAPANGAN">Petugas Lapangan</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={handleInvite} disabled={saving} style={{ flex: 1, padding: 11, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.38)', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Menyimpan...' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
