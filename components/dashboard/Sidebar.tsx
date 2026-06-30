'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/types'
import { LayoutDashboard, Beef, Activity, ScrollText, Users, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

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
    icon: <LayoutDashboard size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'],
  },
  {
    href: '/hewan',
    label: 'Data Hewan',
    icon: <Beef size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'],
  },
  {
    href: '/status',
    label: 'Status',
    icon: <Activity size={18} />,
    roles: ['SUPER_ADMIN', 'PETUGAS_LAPANGAN'],
  },
  {
    href: '/log',
    label: 'Log Aktivitas',
    icon: <ScrollText size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN_PENDAFTARAN'],
  },
  {
    href: '/panitia',
    label: 'Manajemen Panitia',
    icon: <Users size={18} />,
    roles: ['SUPER_ADMIN'],
  },
]

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

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => pathname.startsWith(href)

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

  const Content = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🌙</div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{namaWorkspace || 'Portal Qurban'}</p>
            <p className="text-xs text-gray-400 truncate">{namaUser}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLOR[role]}`}>
          {ROLE_LABEL[role]}
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive(item.href)
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            {item.icon}
            {item.label}
          </a>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:flex w-60 bg-white border-r border-gray-100 flex-col flex-shrink-0">
        <Content />
      </aside>

      <button
        className="md:hidden fixed bottom-5 right-5 z-50 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-xl flex flex-col">
            <Content />
          </aside>
        </>
      )}
    </>
  )
}
