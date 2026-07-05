'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/types'
import type { WorkspacePermissions } from '@/context/WorkspaceContext'
import {
  LayoutDashboard, Beef, Activity, ScrollText, Users, LogOut,
  Menu, X, Moon, Truck, Archive, Settings, Eye,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  key: string
  label: string
  icon: React.ReactNode
  permKey?: keyof WorkspacePermissions
  superAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key:'analitik',    label:'Analitik',          icon:<LayoutDashboard size={16}/>, permKey:'analitik' },
  { key:'hewan',       label:'Data Hewan',         icon:<Beef size={16}/>,            permKey:'data_hewan' },
  { key:'status',      label:'Status',             icon:<Activity size={16}/>,        permKey:'status' },
  { key:'pengantaran', label:'Pengantaran',        icon:<Truck size={16}/>,           permKey:'pengantaran' },
  { key:'log',         label:'Log Aktivitas',      icon:<ScrollText size={16}/>,      permKey:'log' },
  { key:'arsip',       label:'Arsip Periode',      icon:<Archive size={16}/>,         permKey:'arsip' },
  { key:'panitia',     label:'Manajemen Anggota',  icon:<Users size={16}/>,           permKey:'manajemen_anggota' },
  { key:'pengaturan',  label:'Pengaturan',         icon:<Settings size={16}/>,        superAdminOnly:true },
]

interface SidebarProps {
  role:          Role
  roleName:      string   // nama custom role untuk ditampilkan di badge
  namaUser:      string
  namaWorkspace: string
  slug:          string
  permissions:   WorkspacePermissions
}

export default function Sidebar({ role, roleName, namaUser, namaWorkspace, slug, permissions }: SidebarProps) {
  const pathname   = usePathname()
  const supabase   = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isSuperAdmin = role === 'SUPER_ADMIN'

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin
    if (!item.permKey) return true
    return permissions[item.permKey] !== 'none'
  })

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isActive = (key: string) => pathname.includes(`/w/${slug}/${key}`)

  // Warna badge berdasarkan role sistem (untuk indikasi hak akses sistem)
  const badgeColor = isSuperAdmin
    ? { bg:'rgba(167,139,250,0.12)', color:'#c4b5fd', border:'rgba(167,139,250,0.22)' }
    : { bg:'rgba(52,211,153,0.10)',  color:'#34d399',  border:'rgba(52,211,153,0.20)' }

  const Content = () => (
    <div className="flex flex-col h-full">
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background:'linear-gradient(90deg, transparent, rgba(16,185,129,0.65), transparent)' }} />

      {/* Logo + user */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background:'#ffffff', boxShadow:'0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(16,185,129,0.2)', padding:'5px' }}>
            <img src="/logo.png" alt="Ruang Qurban" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-sm truncate" style={{ color:'rgba(255,255,255,0.95)', letterSpacing:'-0.2px' }}>
              {namaWorkspace || 'Portal Qurban'}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color:'rgba(255,255,255,0.34)' }}>{namaUser}</p>
          </div>
        </div>

        {/* Badge pakai roleName (nama custom role) */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background:badgeColor.bg, color:badgeColor.color, border:`1px solid ${badgeColor.border}` }}>
          {roleName}
        </div>
      </div>

      <div className="mx-4 mb-2" style={{ height:1, background:'rgba(255,255,255,0.07)' }}/>
      <p className="px-5 mb-1.5 text-[9px] font-bold uppercase tracking-widest"
        style={{ color:'rgba(255,255,255,0.22)', letterSpacing:'1.2px' }}>Menu Utama</p>

      <nav className="flex-1 px-2.5 overflow-y-auto space-y-0.5">
        {visibleItems.map((item) => {
          const active    = isActive(item.key)
          const isVisitor = item.permKey && permissions[item.permKey] === 'visitor'
          return (
            <Link
              key={item.key}
              href={`/w/${slug}/${item.key}`}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all select-none"
              style={{
                background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
                color:      active ? '#34d399' : 'rgba(255,255,255,0.48)',
                border:     active ? '1px solid rgba(16,185,129,0.22)' : '1px solid transparent',
                boxShadow:  active ? 'inset 0 1px 0 rgba(16,185,129,0.14)' : 'none',
                fontWeight: active ? 600 : 500,
              }}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {isVisitor && <span title="Mode Lihat Saja" style={{ display:'inline-flex', flexShrink:0 }}><Eye size={11} style={{ color:'rgba(255,255,255,0.22)' }}/></span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-2.5 pb-5">
        <div className="mx-1.5 mb-2" style={{ height:1, background:'rgba(255,255,255,0.07)' }}/>
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium w-full"
          style={{ color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer' }}>
          <LogOut size={15}/>
          Keluar
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:flex w-[262px] flex-col flex-shrink-0 relative"
        style={{ background:'rgba(4,10,7,0.78)', backdropFilter:'blur(36px) saturate(180%)', WebkitBackdropFilter:'blur(36px) saturate(180%)', borderRight:'1px solid rgba(255,255,255,0.07)' }}>
        <Content/>
      </aside>

      <button
        className="md:hidden fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl"
        style={{ background:'linear-gradient(135deg, #10b981, #059669)', boxShadow:'0 4px 20px rgba(16,185,129,0.5)' }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={22}/> : <Menu size={22}/>}
      </button>

      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40"
            style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}
            onClick={() => setMobileOpen(false)}/>
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-72 z-50 shadow-2xl flex flex-col relative"
            style={{ background:'rgba(4,10,7,0.96)', backdropFilter:'blur(36px)', WebkitBackdropFilter:'blur(36px)', borderRight:'1px solid rgba(255,255,255,0.1)' }}>
            <Content/>
          </aside>
        </>
      )}
    </>
  )
}
