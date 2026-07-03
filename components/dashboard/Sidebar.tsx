'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/types'
import {
  LayoutDashboard, Beef, Activity, ScrollText, Users, LogOut, Menu, X, Moon, Truck, Archive
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/analitik',
    label: 'Analitik',
    icon: <LayoutDashboard size={16} />,
    roles: ['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'],
  },
  {
    href: '/hewan',
    label: 'Data Hewan',
    icon: <Beef size={16} />,
    roles: ['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'],
  },
  {
    href: '/status',
    label: 'Status',
    icon: <Activity size={16} />,
    roles: ['SUPER_ADMIN', 'PETUGAS_LAPANGAN'],
  },
  {
    href: '/pengantaran',
    label: 'Pengantaran',
    icon: <Truck size={16} />,
    roles: ['SUPER_ADMIN', 'PETUGAS_LAPANGAN'],
  },
  {
    href: '/log',
    label: 'Log Aktivitas',
    icon: <ScrollText size={16} />,
    roles: ['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'],
  },
  {
    href: '/panitia',
    label: 'Manajemen Panitia',
    icon: <Users size={16} />,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/arsip',
    label: 'Arsip Periode',
    icon: <Archive size={16} />,
    roles: ['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'],
  },
]

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_PENDAFTARAN: 'Admin Pendaftaran',
  PETUGAS_LAPANGAN: 'Petugas Lapangan',
}

// Warna badge per role
const ROLE_BADGE: Record<Role, { bg: string; color: string; border: string }> = {
  SUPER_ADMIN: {
    bg: 'rgba(167,139,250,0.12)',
    color: '#c4b5fd',
    border: 'rgba(167,139,250,0.22)',
  },
  ADMIN_PENDAFTARAN: {
    bg: 'rgba(96,165,250,0.12)',
    color: '#60a5fa',
    border: 'rgba(96,165,250,0.22)',
  },
  PETUGAS_LAPANGAN: {
    bg: 'rgba(251,191,36,0.12)',
    color: '#fbbf24',
    border: 'rgba(251,191,36,0.22)',
  },
}

interface SidebarProps {
  role: Role
  namaUser: string
  namaWorkspace: string
}

export default function Sidebar({ role, namaUser, namaWorkspace }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))
  const badge = ROLE_BADGE[role]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => pathname.startsWith(href)

  const Content = () => (
    <div className="flex flex-col h-full">

      {/* Garis aksen hijau di atas */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.65), transparent)',
        }}
      />

      {/* Brand & user */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, #12c98d, #059669)',
              boxShadow: '0 4px 16px rgba(16,185,129,0.4), 0 0 0 1px rgba(16,185,129,0.2)',
            }}
          >
            <Moon size={18} color="white" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p
              className="font-extrabold text-sm truncate"
              style={{ color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.2px' }}
            >
              {namaWorkspace || 'Portal Qurban'}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.34)' }}>
              {namaUser}
            </p>
          </div>
        </div>

        {/* Role badge */}
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}
        >
          {ROLE_LABEL[role]}
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-4 mb-2"
        style={{ height: 1, background: 'rgba(255,255,255,0.07)' }}
      />
      <p
        className="px-5 mb-1.5 text-[9px] font-bold uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.22)', letterSpacing: '1.2px' }}
      >
        Menu Utama
      </p>

      {/* Nav */}
      <nav className="flex-1 px-2.5 overflow-y-auto space-y-0.5">
        {visibleItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all select-none"
              style={{
                background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: active ? '#34d399' : 'rgba(255,255,255,0.48)',
                border: active
                  ? '1px solid rgba(16,185,129,0.22)'
                  : '1px solid transparent',
                boxShadow: active
                  ? 'inset 0 1px 0 rgba(16,185,129,0.14)'
                  : 'none',
                fontWeight: active ? 600 : 500,
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2.5 pb-5">
        <div
          className="mx-1.5 mb-2"
          style={{ height: 1, background: 'rgba(255,255,255,0.07)' }}
        />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium w-full transition-all"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <LogOut size={15} />
          Keluar
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-[262px] flex-col flex-shrink-0 relative"
        style={{
          background: 'rgba(4,10,7,0.78)',
          backdropFilter: 'blur(36px) saturate(180%)',
          WebkitBackdropFilter: 'blur(36px) saturate(180%)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Content />
      </aside>

      {/* Mobile FAB */}
      <button
        className="md:hidden fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          boxShadow: '0 4px 20px rgba(16,185,129,0.5)',
        }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="md:hidden fixed left-0 top-0 bottom-0 w-72 z-50 shadow-2xl flex flex-col relative"
            style={{
              background: 'rgba(4,10,7,0.96)',
              backdropFilter: 'blur(36px)',
              WebkitBackdropFilter: 'blur(36px)',
              borderRight: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Content />
          </aside>
        </>
      )}
    </>
  )
}
