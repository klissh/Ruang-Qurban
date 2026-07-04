'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { UserPlus, Trash2, ShieldCheck, X, Mail, Pencil } from 'lucide-react'

interface AnggotaRow {
  id: string; nama_lengkap: string; role: string
  email: string | null; created_at: string
  workspace_role_id: string | null
  workspace_roles: { id: string; nama: string } | null
}
interface WorkspaceRole { id: string; nama: string; is_super_admin: boolean }

const G = {
  card:  { background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px) saturate(160%)', border:'1px solid rgba(255,255,255,0.09)', borderTop:'1px solid rgba(255,255,255,0.14)', borderRadius:'1.125rem', overflow:'hidden' } as React.CSSProperties,
  input: { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.9)', borderRadius:10, padding:'10px 14px', fontSize:13.5, outline:'none' } as React.CSSProperties,
  modal: { background:'rgba(7,18,11,0.97)', backdropFilter:'blur(36px) saturate(150%)', border:'1px solid rgba(255,255,255,0.11)', borderTop:'1px solid rgba(255,255,255,0.2)', borderRadius:24, width:'100%', maxWidth:440, boxShadow:'0 32px 80px rgba(0,0,0,0.52)' } as React.CSSProperties,
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

interface Props {
  anggotaList: AnggotaRow[]; workspaceRoles: WorkspaceRole[]
  currentUserId: string; workspaceId: string; slug: string
}

export default function PanitiaClient({ anggotaList, workspaceRoles, currentUserId, workspaceId, slug }: Props) {
  const [list, setList]             = useState<AnggotaRow[]>(anggotaList)
  const [showAdd, setShowAdd]       = useState(false)
  const [showEdit, setShowEdit]     = useState(false)
  const [editTarget, setEditTarget] = useState<AnggotaRow | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [roleId, setRoleId]         = useState(workspaceRoles[0]?.id ?? '')
  const [editRoleId, setEditRoleId] = useState('')
  const [saving, setSaving]         = useState(false)
  const [removing, setRemoving]     = useState<string | null>(null)
  const [updating, setUpdating]     = useState<string | null>(null)

  function resolveProfileRole(rId: string) {
    const wr = workspaceRoles.find((r) => r.id === rId)
    return wr?.is_super_admin ? 'SUPER_ADMIN' : 'PETUGAS_LAPANGAN'
  }

  function openEdit(a: AnggotaRow) {
    setEditTarget(a)
    setEditRoleId(a.workspace_role_id ?? workspaceRoles[0]?.id ?? '')
    setShowEdit(true)
  }

  // ── Tambah anggota baru ──
  async function handleTambah() {
    if (!emailInput.trim()) { toast.error('Email wajib diisi'); return }
    setSaving(true)
    try {
      const res  = await fetch('/api/workspace/add-member', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), role: resolveProfileRole(roleId), workspace_role_id: roleId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const wr = workspaceRoles.find((r) => r.id === roleId)
      setList((p) => [...p, { ...data.profile, workspace_roles: wr ? { id:wr.id, nama:wr.nama } : null }])
      setShowAdd(false); setEmailInput('')
      toast.success('Anggota berhasil ditambahkan')
    } catch (e: any) { toast.error(e.message ?? 'Gagal') }
    finally { setSaving(false) }
  }

  // ── Update role member yang sudah ada ──
  async function handleUpdateRole() {
    if (!editTarget || !editRoleId) return
    setUpdating(editTarget.id)
    try {
      const res  = await fetch('/api/workspace/update-member', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ user_id: editTarget.id, workspace_role_id: editRoleId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const wr = workspaceRoles.find((r) => r.id === editRoleId)
      setList((p) => p.map((a) => a.id === editTarget.id
        ? { ...a, role: data.role, workspace_role_id: editRoleId, workspace_roles: wr ? { id:wr.id, nama:wr.nama } : null }
        : a
      ))
      setShowEdit(false); setEditTarget(null)
      toast.success('Role berhasil diperbarui')
    } catch (e: any) { toast.error(e.message ?? 'Gagal') }
    finally { setUpdating(null) }
  }

  // ── Hapus anggota ──
  async function handleRemove(userId: string, nama: string) {
    if (!confirm(`Hapus ${nama} dari workspace ini?`)) return
    setRemoving(userId)
    try {
      const res  = await fetch('/api/workspace/remove-member', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setList((p) => p.filter((a) => a.id !== userId))
      toast.success(`${nama} telah dikeluarkan dari workspace`)
    } catch (e: any) { toast.error(e.message ?? 'Gagal') }
    finally { setRemoving(null) }
  }

  const overlayStyle: React.CSSProperties = {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.62)',
    backdropFilter:'blur(10px)', zIndex:9999,
    display:'flex', overflowY:'auto', padding:'24px 16px',
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-slide-up">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'rgba(255,255,255,0.97)', letterSpacing:'-0.5px', margin:0 }}>
            Manajemen Anggota
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.36)', marginTop:6 }}>{list.length} anggota terdaftar</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:11, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(16,185,129,0.38)' }}>
          <UserPlus size={15}/> Tambah Anggota
        </button>
      </div>

      {/* Info banner */}
      <div style={{ marginBottom:20, padding:'12px 16px', borderRadius:12, background:'rgba(96,165,250,0.07)', border:'1px solid rgba(96,165,250,0.15)' }}>
        <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.5)', margin:0, lineHeight:1.6 }}>
          Anggota harus terlebih dahulu daftar di{' '}
          <a href="/register/member" target="_blank" style={{ color:'#60a5fa', fontWeight:600 }}>/register/member</a>.
          Kelola daftar role di <a href={`/w/${slug}/pengaturan`} style={{ color:'#60a5fa', fontWeight:600 }}>Pengaturan → Manajemen Role</a>.
        </p>
      </div>

      {/* List */}
      <div style={G.card}>
        {list.length === 0 && (
          <div style={{ padding:'64px 0', textAlign:'center' }}>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.3)', margin:0 }}>Belum ada anggota</p>
          </div>
        )}
        {list.map((a, idx) => {
          const roleName = a.workspace_roles?.nama ?? a.role
          const isSA     = a.role === 'SUPER_ADMIN'
          const isMe     = a.id  === currentUserId
          return (
            <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom: idx < list.length-1 ? '1px solid rgba(255,255,255,0.045)' : 'none' }}>
              {/* Avatar */}
              <div style={{ width:40, height:40, borderRadius:'50%', background: isSA ? 'rgba(167,139,250,0.13)' : 'rgba(16,185,129,0.08)', border:`1px solid ${isSA ? 'rgba(167,139,250,0.22)' : 'rgba(16,185,129,0.18)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color: isSA ? '#c4b5fd' : '#34d399', flexShrink:0 }}>
                {a.nama_lengkap.charAt(0).toUpperCase()}
              </div>
              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.88)', margin:0 }}>
                  {a.nama_lengkap}{isMe && <span style={{ fontSize:10, color:'rgba(255,255,255,0.28)', marginLeft:6, fontWeight:400 }}>(Anda)</span>}
                </p>
                <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.28)', marginTop:2 }}>{a.email ?? '—'}</p>
              </div>
              {/* Role badge */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background: isSA ? 'rgba(167,139,250,0.12)' : 'rgba(16,185,129,0.08)', color: isSA ? '#c4b5fd' : '#34d399', border:`1px solid ${isSA ? 'rgba(167,139,250,0.22)' : 'rgba(16,185,129,0.18)'}`, fontSize:10.5, fontWeight:700 }}>
                <ShieldCheck size={11}/>{roleName}
              </div>
              {/* Aksi — hanya untuk member lain */}
              {!isMe && (
                <div style={{ display:'flex', gap:4 }}>
                  {/* Ganti role */}
                  <button
                    onClick={() => openEdit(a)}
                    disabled={updating === a.id}
                    title="Ganti role"
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.45)' }}
                  >
                    <Pencil size={13}/>
                  </button>
                  {/* Hapus */}
                  <button
                    onClick={() => handleRemove(a.id, a.nama_lengkap)}
                    disabled={removing === a.id}
                    title="Hapus dari workspace"
                    style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:8, width:32, height:32, cursor: removing===a.id ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fca5a5', opacity: removing===a.id ? 0.5 : 1 }}
                  >
                    <Trash2 size={13}/>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ══════════════════════════════════════
          Modal: Tambah Anggota Baru
      ══════════════════════════════════════ */}
      {showAdd && (
        <ModalPortal>
          <div onClick={(e) => { if (e.target===e.currentTarget) setShowAdd(false) }} style={overlayStyle}>
            <div style={{ ...G.modal, margin:'auto' }}>
              <div style={{ padding:'22px 26px 18px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h2 style={{ fontSize:16, fontWeight:800, color:'rgba(255,255,255,0.95)', margin:0 }}>Tambah Anggota</h2>
                <button onClick={() => setShowAdd(false)} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, width:34, height:34, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.42)' }}>
                  <X size={15}/>
                </button>
              </div>
              <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:16 }}>
                <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.38)', margin:0, lineHeight:1.6 }}>
                  Masukkan email anggota yang sudah mendaftar. Mereka akan langsung ditambahkan ke workspace ini.
                </p>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.36)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:8 }}>Email Anggota</label>
                  <div style={{ position:'relative' }}>
                    <Mail size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.24)', pointerEvents:'none' }}/>
                    <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key==='Enter' && handleTambah()}
                      placeholder="anggota@email.com" style={{ ...G.input, paddingLeft:38 }}/>
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.36)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:8 }}>Role</label>
                  <select value={roleId} onChange={(e) => setRoleId(e.target.value)} style={{ ...G.input, appearance:'none' }}>
                    {workspaceRoles.map((wr) => <option key={wr.id} value={wr.id}>{wr.nama}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ padding:'18px 26px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:10 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex:1, padding:11, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'rgba(255,255,255,0.58)', fontSize:13.5, fontWeight:600, cursor:'pointer' }}>Batal</button>
                <button onClick={handleTambah} disabled={saving} style={{ flex:1, padding:11, background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:12, color:'white', fontSize:13.5, fontWeight:700, cursor:'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Menambahkan...' : 'Tambahkan'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ══════════════════════════════════════
          Modal: Ganti Role Member
      ══════════════════════════════════════ */}
      {showEdit && editTarget && (
        <ModalPortal>
          <div onClick={(e) => { if (e.target===e.currentTarget) { setShowEdit(false); setEditTarget(null) } }} style={overlayStyle}>
            <div style={{ ...G.modal, margin:'auto' }}>
              <div style={{ padding:'22px 26px 18px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h2 style={{ fontSize:16, fontWeight:800, color:'rgba(255,255,255,0.95)', margin:0 }}>Ganti Role</h2>
                <button onClick={() => { setShowEdit(false); setEditTarget(null) }} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, width:34, height:34, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.42)' }}>
                  <X size={15}/>
                </button>
              </div>
              <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:16 }}>
                {/* Info member */}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(16,185,129,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#34d399', flexShrink:0 }}>
                    {editTarget.nama_lengkap.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)', margin:0 }}>{editTarget.nama_lengkap}</p>
                    <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.28)', margin:0, marginTop:2 }}>{editTarget.email ?? '—'}</p>
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.36)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:8 }}>Pilih Role Baru</label>
                  <select value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)} style={{ ...G.input, appearance:'none' }}>
                    {workspaceRoles.map((wr) => <option key={wr.id} value={wr.id}>{wr.nama}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ padding:'18px 26px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:10 }}>
                <button onClick={() => { setShowEdit(false); setEditTarget(null) }} style={{ flex:1, padding:11, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'rgba(255,255,255,0.58)', fontSize:13.5, fontWeight:600, cursor:'pointer' }}>Batal</button>
                <button onClick={handleUpdateRole} disabled={updating===editTarget.id} style={{ flex:1, padding:11, background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:12, color:'white', fontSize:13.5, fontWeight:700, cursor:'pointer', opacity: updating===editTarget.id ? 0.6 : 1 }}>
                  {updating===editTarget.id ? 'Menyimpan...' : 'Simpan Role'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
