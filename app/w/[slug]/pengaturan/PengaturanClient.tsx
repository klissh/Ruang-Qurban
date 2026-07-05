'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Plus, Trash2, Edit2, X, ShieldCheck, Truck, Phone } from 'lucide-react'
import { toast } from 'sonner'

type PageAccess = 'full' | 'visitor' | 'none'
interface Permissions {
  analitik: PageAccess; data_hewan: PageAccess; status: PageAccess
  pengantaran: PageAccess; log: PageAccess; arsip: PageAccess
  manajemen_anggota: 'full' | 'none'
}
interface WorkspaceRole {
  id: string; nama: string; permissions: Permissions
  is_super_admin: boolean; created_at: string
}
interface Workspace { id: string; nama: string; slug: string; created_at: string }
interface KurirItem { id: string; nama: string; no_hp: string | null; created_at: string }

const DEFAULT_PERMS: Permissions = {
  analitik:'none', data_hewan:'none', status:'none',
  pengantaran:'none', log:'none', arsip:'none', manajemen_anggota:'none',
}

const PAGES_CFG: { key: keyof Permissions; label: string; hasVisitor: boolean }[] = [
  { key:'analitik',          label:'Analitik',          hasVisitor:true  },
  { key:'data_hewan',        label:'Data Hewan',         hasVisitor:true  },
  { key:'status',            label:'Status Hewan',       hasVisitor:true  },
  { key:'pengantaran',       label:'Pengantaran',        hasVisitor:true  },
  { key:'log',               label:'Log Aktivitas',      hasVisitor:false },
  { key:'arsip',             label:'Arsip Periode',      hasVisitor:true  },
  { key:'manajemen_anggota', label:'Manajemen Anggota',  hasVisitor:false },
]

const G = {
  card:  { background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px) saturate(160%)', border:'1px solid rgba(255,255,255,0.09)', borderTop:'1px solid rgba(255,255,255,0.14)', borderRadius:'1.125rem', overflow:'hidden' } as React.CSSProperties,
  modal: { background:'rgba(7,18,11,0.97)', backdropFilter:'blur(36px) saturate(150%)', border:'1px solid rgba(255,255,255,0.11)', borderTop:'1px solid rgba(255,255,255,0.2)', borderRadius:24, width:'100%', maxWidth:520, boxShadow:'0 32px 80px rgba(0,0,0,0.52)' } as React.CSSProperties,
  input: { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.9)', borderRadius:10, padding:'10px 14px', fontSize:13.5, outline:'none' } as React.CSSProperties,
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(10px)', zIndex:9999, display:'flex', overflowY:'auto', padding:'24px 16px' } as React.CSSProperties,
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

function RadioDot({ active, color }: { active: boolean; color: string }) {
  // ── CRUD Kurir ────────────────────────────────────────────────────────────
  function openKurirModal(k?: KurirItem) {
    setEditKurir(k ?? null)
    setKurirNama(k?.nama ?? '')
    setKurirHp(k?.no_hp ?? '')
    setShowKurirModal(true)
  }

  async function handleSaveKurir() {
    if (!kurirNama.trim()) { toast.error('Nama kurir wajib diisi'); return }
    setSavingKurir(true)
    try {
      const method = editKurir ? 'PATCH' : 'POST'
      const body: Record<string, string> = { nama: kurirNama.trim() }
      if (editKurir) body.id = editKurir.id
      if (kurirHp.trim()) body.no_hp = kurirHp.trim()
      const res  = await fetch('/api/kurir', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (editKurir) {
        setKurirList((p) => p.map((k) => k.id === data.kurir.id ? data.kurir : k))
        toast.success('Kurir diperbarui')
      } else {
        setKurirList((p) => [...p, data.kurir].sort((a, b) => a.nama.localeCompare(b.nama)))
        toast.success('Kurir ditambahkan')
      }
      setShowKurirModal(false)
    } catch (e: any) { toast.error(e.message ?? 'Gagal') }
    finally { setSavingKurir(false) }
  }

  async function handleDeleteKurir(id: string, nama: string) {
    if (!confirm(`Hapus kurir "${nama}"?`)) return
    setDeletingKurir(id)
    try {
      const res = await fetch(`/api/kurir?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setKurirList((p) => p.filter((k) => k.id !== id))
      toast.success(`${nama} dihapus`)
    } catch { toast.error('Gagal menghapus kurir') }
    finally { setDeletingKurir(null) }
  }

  return (
    <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${active ? color : 'rgba(255,255,255,0.15)'}`, background: active ? `${color}33` : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {active && <div style={{ width:8, height:8, borderRadius:'50%', background:color }} />}
    </div>
        {/* ════════════════════════ MANAJEMEN KURIR ════════════════════════ */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: 0 }}>Manajemen Kurir</h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Daftar pengantar daging qurban yang bisa dipilih di halaman Pengantaran</p>
            </div>
            <button onClick={() => openKurirModal()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none',
                borderRadius: 10, color: 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Tambah Kurir
            </button>
          </div>

          <div style={G.card}>
            {kurirList.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <Truck size={28} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 10 }} />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', margin: 0 }}>Belum ada kurir — tambahkan pengantar pertama</p>
              </div>
            )}
            {kurirList.map((k, idx) => (
              <div key={k.id} style={{ padding: '12px 18px', borderBottom: idx < kurirList.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck size={15} style={{ color: '#34d399' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>{k.nama}</p>
                  {k.no_hp && (
                    <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={10} />{k.no_hp}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openKurirModal(k)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)' }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDeleteKurir(k.id, k.nama)} disabled={deletingKurir === k.id}
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, width: 32, height: 32, cursor: deletingKurir === k.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5', opacity: deletingKurir === k.id ? 0.5 : 1 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal tambah/edit kurir */}
        {showKurirModal && (
          <ModalPortal>
            <div onClick={(e) => { if (e.target === e.currentTarget) setShowKurirModal(false) }} style={G.overlay}>
              <div style={{ ...G.modal, margin: 'auto' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>{editKurir ? 'Edit Kurir' : 'Tambah Kurir'}</h2>
                  <button onClick={() => setShowKurirModal(false)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.42)' }}><X size={14} /></button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 7 }}>Nama Kurir</label>
                    <input value={kurirNama} onChange={(e) => setKurirNama(e.target.value)} placeholder="Nama lengkap pengantar" style={G.input} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveKurir()} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 7 }}>No. HP <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none' }}>(opsional)</span></label>
                    <input value={kurirHp} onChange={(e) => setKurirHp(e.target.value)} placeholder="08xxxxxxxxxx" style={G.input} onKeyDown={(e) => e.key === 'Enter' && handleSaveKurir()} />
                  </div>
                </div>
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowKurirModal(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.55)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                  <button onClick={handleSaveKurir} disabled={savingKurir} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: savingKurir ? 0.6 : 1 }}>
                    {savingKurir ? 'Menyimpan...' : editKurir ? 'Simpan' : 'Tambahkan'}
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

  )
}

function RoleModal({ role, onClose, onSave }: {
  role: Partial<WorkspaceRole> | null; onClose: () => void; onSave: (r: WorkspaceRole) => void
}) {
  const isEdit = !!role?.id
  const [nama, setNama]     = useState(role?.nama ?? '')
  const [perms, setPerms]   = useState<Permissions>(role?.permissions ?? DEFAULT_PERMS)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!nama.trim()) { toast.error('Nama role wajib diisi'); return }
    setSaving(true)
    try {
      const url    = isEdit ? `/api/workspace/roles/${role!.id}` : '/api/workspace/roles'
      const method = isEdit ? 'PUT' : 'POST'
      const res  = await fetch(url, { method, headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ nama: nama.trim(), permissions: perms }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave(data.role)
      toast.success(isEdit ? 'Role diperbarui' : 'Role dibuat')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <ModalPortal>
      <div
        style={G.overlay}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div style={{ ...G.modal, margin:'auto' }}>
          {/* Header */}
          <div style={{ padding:'22px 26px 18px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h2 style={{ fontSize:16, fontWeight:800, color:'rgba(255,255,255,0.95)', margin:0 }}>
              {isEdit ? 'Edit Role' : 'Buat Role Baru'}
            </h2>
            <button
              onClick={onClose}
              style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, width:34, height:34, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.42)' }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding:'20px 26px', display:'flex', flexDirection:'column', gap:20 }}>
            {/* Nama */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.36)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:8 }}>
                Nama Role
              </label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="contoh: Kurir, Panitia Utama..."
                style={G.input}
              />
            </div>

            {/* Permissions */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.36)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:12 }}>
                Akses Halaman
              </label>

              {/* ── MOBILE: kolom compact 1fr+55+55+55 (sm:hidden) ── */}
              <div className="sm:hidden" style={{ borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden' }}>
                {/* Header */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 55px 55px 55px', padding:'8px 12px', background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  {[['Halaman','left'],['T.Ada','center'],['Lihat','center'],['Full','center']].map(([h, align]) => (
                    <span key={h} style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', textAlign: align as any }}>{h}</span>
                  ))}
                </div>
                {PAGES_CFG.map(({ key, label, hasVisitor }, idx) => {
                  const cur = perms[key]
                  return (
                    <div key={key} style={{ display:'grid', gridTemplateColumns:'1fr 55px 55px 55px', padding:'10px 12px', alignItems:'center', borderBottom: idx < PAGES_CFG.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: idx%2===0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize:12, color:'rgba(255,255,255,0.72)', fontWeight:500, paddingRight:4 }}>{label}</span>
                      <div style={{ display:'flex', justifyContent:'center' }} onClick={() => setPerms((p) => ({ ...p, [key]:'none' }))}>
                        <RadioDot active={cur==='none'} color="#ef4444" />
                      </div>
                      <div style={{ display:'flex', justifyContent:'center' }}>
                        {hasVisitor
                          ? <div onClick={() => setPerms((p) => ({ ...p, [key]:'visitor' }))}><RadioDot active={cur==='visitor'} color="#f59e0b" /></div>
                          : <span style={{ fontSize:11, color:'rgba(255,255,255,0.15)', display:'block', textAlign:'center' }}>—</span>}
                      </div>
                      <div style={{ display:'flex', justifyContent:'center' }} onClick={() => setPerms((p) => ({ ...p, [key]:'full' }))}>
                        <RadioDot active={cur==='full'} color="#10b981" />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── DESKTOP: tabel original (hidden sm:block) ── */}
              <div className="hidden sm:block" style={{ borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
               <div style={{ minWidth:380 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 90px', padding:'8px 14px', background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  {['Halaman','Tidak Ada','Lihat Saja','Full'].map((h) => (
                    <span key={h} style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', textAlign: h==='Halaman' ? 'left' : 'center' }}>{h}</span>
                  ))}
                </div>
                {PAGES_CFG.map(({ key, label, hasVisitor }, idx) => {
                  const cur = perms[key]
                  return (
                    <div key={key} style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 90px', padding:'11px 14px', alignItems:'center', borderBottom: idx < PAGES_CFG.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: idx%2===0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize:13, color:'rgba(255,255,255,0.72)', fontWeight:500 }}>{label}</span>
                      <div style={{ display:'flex', justifyContent:'center' }} onClick={() => setPerms((p) => ({ ...p, [key]:'none' }))}>
                        <RadioDot active={cur==='none'} color="#ef4444" />
                      </div>
                      <div style={{ display:'flex', justifyContent:'center' }}>
                        {hasVisitor
                          ? <div onClick={() => setPerms((p) => ({ ...p, [key]:'visitor' }))}><RadioDot active={cur==='visitor'} color="#f59e0b" /></div>
                          : <span style={{ fontSize:11, color:'rgba(255,255,255,0.15)', textAlign:'center' }}>—</span>}
                      </div>
                      <div style={{ display:'flex', justifyContent:'center' }} onClick={() => setPerms((p) => ({ ...p, [key]:'full' }))}>
                        <RadioDot active={cur==='full'} color="#10b981" />
                      </div>
                    </div>
                  )
                })}
               </div>
              </div>

              <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:8, lineHeight:1.6 }}>
                <span style={{ color:'#ef444499' }}>● T.Ada</span> — tersembunyi dari sidebar &nbsp;·&nbsp;
                <span style={{ color:'#f59e0b99' }}>● Lihat</span> — bisa masuk, tidak bisa ubah &nbsp;·&nbsp;
                <span style={{ color:'#10b98199' }}>● Full</span> — akses penuh
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding:'16px 26px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:10 }}>
            <button
              onClick={onClose}
              style={{ flex:1, padding:11, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'rgba(255,255,255,0.58)', fontSize:13.5, fontWeight:600, cursor:'pointer' }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ flex:1, padding:11, background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:12, color:'white', fontSize:13.5, fontWeight:700, cursor:'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Role')}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default function PengaturanClient({ workspace, roles: initialRoles, slug }: {
  workspace: Workspace; roles: WorkspaceRole[]; slug: string
}) {
  const [tab, setTab]             = useState<'info'|'roles'>('info')
  const [roles, setRoles]         = useState<WorkspaceRole[]>(initialRoles)
  const [modalRole, setModalRole] = useState<Partial<WorkspaceRole> | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)

  async function handleDelete(r: WorkspaceRole) {
    if (r.is_super_admin) { toast.error('Role Super Admin tidak bisa dihapus'); return }
    if (!confirm(`Hapus role "${r.nama}"? Anggota dengan role ini akan kehilangan akses.`)) return
    setDeleting(r.id)
    try {
      const res = await fetch(`/api/workspace/roles/${r.id}`, { method:'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRoles((p) => p.filter((x) => x.id !== r.id))
      toast.success(`Role "${r.nama}" dihapus`)
    } catch (e: any) { toast.error(e.message) }
    finally { setDeleting(null) }
  }

  function handleSaved(saved: WorkspaceRole) {
    setRoles((p) => {
      const i = p.findIndex((r) => r.id === saved.id)
      if (i >= 0) { const n = [...p]; n[i] = saved; return n }
      return [...p, saved]
    })
    setShowModal(false)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding:'8px 18px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer',
    background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
    color: active ? '#34d399' : 'rgba(255,255,255,0.38)',
    border: active ? '1px solid rgba(16,185,129,0.22)' : '1px solid transparent',
  })

  return (
    <div className="p-6 md:p-8 pb-20 md:pb-8 max-w-3xl mx-auto animate-slide-up">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'rgba(255,255,255,0.97)', letterSpacing:'-0.5px', margin:0 }}>Pengaturan</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.36)', marginTop:6 }}>{workspace.nama}</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        <button style={tabStyle(tab==='info')} onClick={() => setTab('info')}>Info Workspace</button>
        <button style={tabStyle(tab==='roles')} onClick={() => setTab('roles')}>Manajemen Role</button>
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div style={{ background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.09)', borderTop:'1px solid rgba(255,255,255,0.14)', borderRadius:'1.125rem', padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Building2 size={22} color="#34d399" />
            </div>
            <div>
              <p style={{ fontSize:18, fontWeight:800, color:'rgba(255,255,255,0.95)', margin:0 }}>{workspace.nama}</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:2 }}>ID: {workspace.id}</p>
            </div>
          </div>
          {[
            { label:'Nama Workspace', value: workspace.nama },
            { label:'Slug (URL)',      value: workspace.slug },
            { label:'URL Dashboard',   value: `/w/${workspace.slug}/analitik` },
            { label:'Dibuat', value: workspace.created_at ? new Date(workspace.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}) : '-' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>{label}</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.82)', fontWeight:600, fontFamily: label.includes('URL')||label.includes('Slug') ? 'monospace' : undefined }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Roles */}
      {tab === 'roles' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.36)', margin:0 }}>{roles.length} role tersedia</p>
            <button
              onClick={() => { setModalRole({}); setShowModal(true) }}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:10, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}
            >
              <Plus size={14} /> Buat Role Baru
            </button>
          </div>

          <div style={G.card}>
            {roles.length === 0 && (
              <div style={{ padding:'48px 0', textAlign:'center' }}>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.28)', margin:0 }}>Belum ada role</p>
              </div>
            )}
            {roles.map((r, idx) => {
              const fullCount    = Object.values(r.permissions).filter((v) => v==='full').length
              const visitorCount = Object.values(r.permissions).filter((v) => v==='visitor').length
              return (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 22px', borderBottom: idx < roles.length-1 ? '1px solid rgba(255,255,255,0.045)' : 'none' }}>
                  <div style={{ width:38, height:38, borderRadius:12, background: r.is_super_admin ? 'rgba(167,139,250,0.12)' : 'rgba(16,185,129,0.08)', border:`1px solid ${r.is_super_admin ? 'rgba(167,139,250,0.22)' : 'rgba(16,185,129,0.18)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ShieldCheck size={17} color={r.is_super_admin ? '#c4b5fd' : '#34d399'} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.88)', margin:0 }}>{r.nama}</p>
                    <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.28)', marginTop:2 }}>
                      {fullCount} full · {visitorCount} lihat saja{r.is_super_admin && ' · Role sistem'}
                    </p>
                  </div>
                  {!r.is_super_admin && (
                    <div style={{ display:'flex', gap:6 }}>
                      <button
                        onClick={() => { setModalRole(r); setShowModal(true) }}
                        style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', gap:5, fontSize:12 }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deleting === r.id}
                        style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'#fca5a5', display:'flex', alignItems:'center', gap:5, fontSize:12, opacity: deleting===r.id ? 0.5 : 1 }}
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <RoleModal
          role={modalRole}
          onClose={() => setShowModal(false)}
          onSave={handleSaved}
        />
      )}
    </div>
  )
}
