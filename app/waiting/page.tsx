'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Moon, Clock, LogOut } from 'lucide-react'

const MARQUEE_TEXT = 'Mohon menunggu untuk diinvite ke workspace · Silakan hubungi Super Admin workspace Anda · '

export default function WaitingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(false)

  async function checkWorkspace() {
    setChecking(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id_workspace, workspaces(slug)')
      .eq('id', user.id)
      .single()

    if (profile?.id_workspace) {
      const ws = profile.workspaces as any
      const slug = ws?.slug ?? 'default'
      router.push(`/w/${slug}/analitik`)
    }
    setChecking(false)
  }

  // Poll every 30 seconds
  useEffect(() => {
    checkWorkspace()
    const interval = setInterval(checkWorkspace, 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)' }}
    >
      <div className="pointer-events-none fixed" style={{ top: '-20%', left: '-15%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 65%)' }} />
      <div className="pointer-events-none fixed" style={{ bottom: '-25%', right: '-10%', width: 800, height: 800, background: 'radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 65%)' }} />

      {/* Marquee */}
      <div
        className="fixed top-0 left-0 right-0 py-2.5 overflow-hidden"
        style={{ background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.12)' }}
      >
        <div
          className="whitespace-nowrap text-xs font-medium"
          style={{
            color: 'rgba(52,211,153,0.65)',
            animation: 'marquee 28s linear infinite',
            display: 'inline-block',
          }}
        >
          {MARQUEE_TEXT.repeat(6)}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="relative z-10 text-center px-6 mt-10">
        {/* Icon */}
        <div className="inline-flex mb-8">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.18)',
              boxShadow: '0 0 60px rgba(16,185,129,0.08)',
            }}
          >
            <Clock size={40} color="#34d399" strokeWidth={1.6} style={{ opacity: checking ? 0.5 : 1, transition: 'opacity 0.3s' }} />
          </div>
        </div>

        <div
          className="w-2.5 h-2.5 rounded-full mx-auto mb-6"
          style={{
            background: '#34d399',
            boxShadow: '0 0 0 4px rgba(52,211,153,0.2)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }`}</style>

        <h1
          className="text-2xl font-extrabold mb-3"
          style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.5px' }}
        >
          Menunggu Undangan Workspace
        </h1>
        <p
          className="text-sm max-w-sm mx-auto leading-relaxed mb-10"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Akun Anda sudah terdaftar. Super Admin workspace akan menambahkan Anda.
          Halaman ini otomatis memperbarui setiap 30 detik.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={checkWorkspace}
            disabled={checking}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', cursor: 'pointer' }}
          >
            {checking ? 'Memeriksa...' : 'Periksa Sekarang'}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs transition-all"
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}
          >
            <LogOut size={13} /> Keluar
          </button>
        </div>
      </div>
    </div>
  )
}
