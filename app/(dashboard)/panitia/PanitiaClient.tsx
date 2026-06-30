'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2 } from 'lucide-react'
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

const ROLE_COLOR: Record<Role, string> = {
  SUPER_ADMIN: 'bg-purple-50 text-purple-700',
  ADMIN_PENDAFTARAN: 'bg-blue-50 text-blue-700',
  PETUGAS_LAPANGAN: 'bg-amber-50 text-amber-700',
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
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Panitia</h1>
          <p className="text-gray-400 text-sm mt-0.5">{list.length} anggota terdaftar</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition"
        >
          <UserPlus size={15} /> Tambah Panitia
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {list.map((p, idx) => (
          <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${idx > 0 ? 'border-t border-gray-50' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
              {p.nama_lengkap.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{p.nama_lengkap}</p>
              <p className="text-xs text-gray-400 mt-0.5">Bergabung {formatTanggalPendek(p.created_at)}</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLOR[p.role]}`}>
              {ROLE_LABEL[p.role]}
            </span>
            {p.id !== currentUserId && (
              <button className="text-gray-300 hover:text-red-500 transition ml-2" title="Hapus panitia">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">Belum ada anggota panitia</div>
        )}
      </div>

      {/* Modal Tambah Panitia */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">Tambah Anggota Panitia</h2>
            </div>
            <div className="p-5 space-y-3">
              {[
                { field: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', placeholder: 'Ahmad Fauzi' },
                { field: 'email', label: 'Email Login', type: 'email', placeholder: 'ahmad@masjid.com' },
                { field: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter' },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Role / Jabatan</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ADMIN_PENDAFTARAN">Admin Pendaftaran</option>
                  <option value="PETUGAS_LAPANGAN">Petugas Lapangan</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium">Batal</button>
              <button onClick={handleInvite} disabled={saving}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-sm font-medium transition">
                {saving ? 'Menyimpan...' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
