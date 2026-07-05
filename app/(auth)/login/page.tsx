'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const from = searchParams.get('from') ?? null

  async function handleLogin() {
    if (!email || !password) { setError('Email dan password wajib diisi'); return }
    setError('')
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) {
      setError(authError?.message === 'Email not confirmed'
        ? 'Email belum diverifikasi. Cek inbox Anda.'
        : 'Email atau password salah')
      setLoading(false)
      return
    }
    window.location.href = from && from.startsWith('/w/') ? from : '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)' }}>
      <div className="pointer-events-none fixed" style={{ top:'-20%', left:'-15%', width:700, height:700, background:'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 65%)' }} />
      <div className="pointer-events-none fixed" style={{ bottom:'-25%', right:'-10%', width:800, height:800, background:'radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 65%)' }} />

      <div className="w-full max-w-[400px] relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex relative mb-5">
            <div className="w-[74px] h-[74px] rounded-3xl flex items-center justify-center"
              style={{ background:'#ffffff', boxShadow:'0 0 0 1px rgba(16,185,129,0.28), 0 8px 40px rgba(0,0,0,0.35)', padding:'10px' }}>
              <img src="/logo.png" alt="Ruang Qurban" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color:'rgba(255,255,255,0.97)', letterSpacing:'-0.5px' }}>
            Ruang Qurban
          </h1>
          <p className="text-sm mt-2" style={{ color:'rgba(255,255,255,0.35)' }}>Sistem Manajemen Kepanitiaan Qurban</p>
        </div>

        <div className="rounded-3xl p-8"
          style={{ background:'rgba(255,255,255,0.07)', backdropFilter:'blur(32px) saturate(150%)', WebkitBackdropFilter:'blur(32px) saturate(150%)', border:'1px solid rgba(255,255,255,0.1)', borderTop:'1px solid rgba(255,255,255,0.2)', boxShadow:'0 24px 64px rgba(0,0,0,0.38)' }}>

          <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color:'rgba(255,255,255,0.38)', letterSpacing:'0.8px' }}>
            Masuk ke Akun Anda
          </p>

          {error && (
            <div className="text-sm rounded-xl px-4 py-3 mb-5"
              style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', color:'#fca5a5' }}>
              {error}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color:'rgba(255,255,255,0.38)', letterSpacing:'0.8px' }}>Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:'rgba(255,255,255,0.24)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="panitia@masjid.com"
                className="w-full rounded-xl pl-11 pr-4 py-3 text-sm outline-none"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.9)' }}
              />
            </div>
          </div>

          {/* Password + eye toggle */}
          <div className="mb-7">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color:'rgba(255,255,255,0.38)', letterSpacing:'0.8px' }}>Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:'rgba(255,255,255,0.24)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full rounded-xl pl-11 pr-11 py-3 text-sm outline-none"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.9)' }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: loading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow:'0 4px 20px rgba(16,185,129,0.42)' }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm" style={{ color:'rgba(255,255,255,0.28)' }}>
            Belum punya akun?{' '}
            <a href="/register" className="font-semibold" style={{ color:'#34d399' }}>Daftar sekarang</a>
          </p>
          <p className="text-sm" style={{ color:'rgba(255,255,255,0.28)' }}>
            Jamaah?{' '}
            <a href="/tracking" className="font-semibold" style={{ color:'#34d399' }}>Cek status hewan qurban Anda →</a>
          </p>
        </div>
      </div>
    </div>
  )
}
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
