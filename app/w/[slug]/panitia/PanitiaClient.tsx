'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, ShieldCheck, UserCog, Wrench, X, Mail, Search } from 'lucide-react'
import { formatTanggalPendek } from '@/lib/utils'
import type { Role } from '@/types'

interface AnggotaRow {
  id: string
  nama_lengkap: string
  role: Role
  email: string | null
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
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.9)',
    borderRadius: 10, padding: '10px 14px', fontSize: 13.5, outline: 'none',
  } as React.CSSProperties,
  modal: {
    background: 'rgba(7,18,11,0.97)',
    backdropFilter: 'blur(36px) saturate(150%)',
    WebkitBackdropFilter: 'blur(36px) saturate(150%)',
    border: '1px solid rgba(255,255,255,0.11)',
    borderTop: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 24, width: '100%', maxWidth: 440,
    boxShadow: '0 32px 80px rgba(0,0,0,0.52)',
  } as React.CSSProperties,
}

interface Props {
  anggotaList: AnggotaRow[]
  currentUserId: string
  workspaceId: string
  slug: string
}

export default function PanitiaClient({ anggotaList, currentUserId, workspaceId, slug }: Props) {
  const [list, setList] = useState<AnggotaRow[]>(anggotaList)
  const [showModal, setShowModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [roleInput, setRoleInput] = useState<Role>('PETUGAS_LAPANGAN')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleTambah() {
    if (!emailInput.trim()) {
      toast.error('Email wajib diisi')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/workspace/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), role: roleInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setList((p) => [...p, data.profile])
      setShowModal(false)
      setEmailInput('')
      setRoleInput('PETUGAS_LAPANGAN')
      toast.success(`Anggota berhasil ditambahkan`)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menambahkan anggota')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(userId: string, nama: string) {
    if (!confirm(`Hapus ${nama} dari workspace ini?`)) return
    setRemoving(userId)
    try {
      const res = await fetch('/api/workspace/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setList((p) => p.filter((a) => a.id !== userId))
      toast.success(`${nama} telah dikeluarkan dari workspace`)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghapus anggota')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-slide-up">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>
            Manajemen Anggota
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>
            {list.length} anggota terdaftar
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 11, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.38)' }}
        >
          <UserPlus size={15} /> Tambah Anggota
        </button>
      </div>

      {/* Info banner */}
      <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)' }}>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
          Anggota harus terlebih dahulu membuat akun di{' '}
          <a href="/register/member" target="_blank" style={{ color: '#60a5fa', fontWeight: 600 }}>/register/member</a>.
          Setelah itu, masukkan email mereka di sini untuk menambahkan ke workspace ini.
        </p>
      </div>

      {/* List */}
      <div style={G.card}>
        {list.length === 0 && (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Belum ada anggota</p>
          </div>
        )}
        {list.map((a, idx) => {
          const rs = ROLE_STYLE[a.role]
          const RoleIcon = rs.Icon
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px', borderBottom: idx < list.length - 1 ? '1px solid rgba(255,255,255,0.045)' : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {a.nama_lengkap.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>{a.nama_lengkap}</p>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{a.email ?? '—'}</p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, fontSize: 10.5, fontWeight: 700 }}>
                <RoleIcon size={11} />
                {ROLE_LABEL[a.role]}
              </div>
              {a.id !== currentUserId && (
                <button
                  onClick={() => handleRemove(a.id, a.nama_lengkap)}
                  disabled={removing === a.id}
                  style={{ background: 'none', border: 'none', padding: 7, cursor: removing === a.id ? 'not-allowed' : 'pointer', color: 'rgba(255,255,255,0.18)', borderRadius: 8, display: 'flex', alignItems: 'center', opacity: removing === a.id ? 0.5 : 1 }}
                  title="Hapus dari workspace"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Tambah */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={G.modal}>
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Tambah Anggota</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.6 }}>
                Masukkan email anggota yang sudah mendaftar. Mereka akan langsung ditambahkan ke workspace ini.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>Email Anggota</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.24)', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="anggota@email.com"
                    style={{ ...G.input, paddingLeft: 38 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>Role</label>
                <select value={roleInput} onChange={(e) => setRoleInput(e.target.value as Role)} style={{ ...G.input, appearance: 'none' }}>
                  <option value="PETUGAS_LAPANGAN">Petugas Lapangan</option>
                  <option value="ADMIN_PENDAFTARAN">Admin Pendaftaran</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>
            <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.58)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleTambah} disabled={saving} style={{ flex: 1, padding: 11, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.38)', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Menambahkan...' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
