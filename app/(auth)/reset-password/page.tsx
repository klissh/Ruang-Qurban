'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

const BG = 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)'

function ResetPasswordContent() {
  const router  = useRouter()
  const supabase = createClient()
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw]                 = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [success, setSuccess]               = useState(false)

  // Strength helpers
  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : 3
  const strengthLabel = ['', 'Terlalu pendek', 'Cukup', 'Kuat'][strength]
  const strengthColor = ['', '#ef4444', '#f59e0b', '#10b981'][strength]

  async function handleReset() {
    if (!password || !confirmPassword) { setError('Semua field wajib diisi'); return }
    if (password.length < 6)           { setError('Password minimal 6 karakter'); return }
    if (password !== confirmPassword)  { setError('Konfirmasi password tidak cocok'); return }
    setError('')
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) { setError('Gagal memperbarui password. Coba lagi.'); return }
    setSuccess(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
        <div className="pointer-events-none fixed" style={{ top:'-20%',left:'-15%',width:700,height:700,background:'radial-gradient(circle,rgba(16,185,129,0.13) 0%,transparent 65%)' }} />
        <div className="w-full max-w-[400px] relative z-10 text-center">
          <div className="inline-flex mb-8">
            <div className="w-[74px] h-[74px] rounded-3xl flex items-center justify-center"
              style={{ background:'#ffffff',boxShadow:'0 0 0 1px rgba(16,185,129,0.28),0 8px 40px rgba(0,0,0,0.35)',padding:'10px' }}>
              <img src="/logo.png" alt="Ruang Qurban" style={{ width:'100%',height:'100%',objectFit:'contain' }} />
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle size={28} color="#34d399" />
          </div>
          <h2 className="text-xl font-extrabold mb-3" style={{ color:'rgba(255,255,255,0.95)',letterSpacing:'-0.4px' }}>
            Password Berhasil Diperbarui
          </h2>
          <p className="text-sm" style={{ color:'rgba(255,255,255,0.38)' }}>
            Mengalihkan ke halaman masuk...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="pointer-events-none fixed" style={{ top:'-20%',left:'-15%',width:700,height:700,background:'radial-gradient(circle,rgba(16,185,129,0.13) 0%,transparent 65%)' }} />
      <div className="pointer-events-none fixed" style={{ bottom:'-25%',right:'-10%',width:800,height:800,background:'radial-gradient(circle,rgba(5,150,105,0.08) 0%,transparent 65%)' }} />

      <div className="w-full max-w-[400px] relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex relative mb-5">
            <div className="w-[74px] h-[74px] rounded-3xl flex items-center justify-center"
              style={{ background:'#ffffff',boxShadow:'0 0 0 1px rgba(16,185,129,0.28),0 8px 40px rgba(0,0,0,0.35)',padding:'10px' }}>
              <img src="/logo.png" alt="Ruang Qurban" style={{ width:'100%',height:'100%',objectFit:'contain' }} />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color:'rgba(255,255,255,0.97)',letterSpacing:'-0.5px' }}>
            Buat Password Baru
          </h1>
          <p className="text-sm mt-2" style={{ color:'rgba(255,255,255,0.35)' }}>
            Masukkan password baru untuk akun Anda
          </p>
        </div>

        <div className="rounded-3xl p-8"
          style={{ background:'rgba(255,255,255,0.07)',backdropFilter:'blur(32px) saturate(150%)',WebkitBackdropFilter:'blur(32px) saturate(150%)',border:'1px solid rgba(255,255,255,0.1)',borderTop:'1px solid rgba(255,255,255,0.2)',boxShadow:'0 24px 64px rgba(0,0,0,0.38)' }}>

          <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color:'rgba(255,255,255,0.38)',letterSpacing:'0.8px' }}>
            Kata Sandi Baru
          </p>

          {error && (
            <div className="text-sm rounded-xl px-4 py-3 mb-5"
              style={{ background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',color:'#fca5a5' }}>
              {error}
            </div>
          )}

          {/* Password Baru */}
          <div className="mb-2">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color:'rgba(255,255,255,0.38)',letterSpacing:'0.8px' }}>Password Baru</label>
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:'rgba(255,255,255,0.24)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="w-full rounded-xl pl-11 pr-11 py-3 text-sm outline-none"
                style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',color:'rgba(255,255,255,0.9)' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ background:'none',border:'none',cursor:'pointer',padding:0,color:'rgba(255,255,255,0.3)',display:'flex',alignItems:'center' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Strength bar */}
          {password.length > 0 && (
            <div className="mb-4">
              <div className="flex gap-1 mb-1">
                {[1,2,3].map(i => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: i <= strength ? strengthColor : 'rgba(255,255,255,0.08)' }} />
                ))}
              </div>
              <p className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</p>
            </div>
          )}

          {/* Konfirmasi Password */}
          <div className="mb-7">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color:'rgba(255,255,255,0.38)',letterSpacing:'0.8px' }}>Konfirmasi Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:'rgba(255,255,255,0.24)' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                placeholder="Ulangi password baru"
                className="w-full rounded-xl pl-11 pr-11 py-3 text-sm outline-none"
                style={{
                  background:'rgba(255,255,255,0.05)',
                  border: confirmPassword.length > 0
                    ? password === confirmPassword
                      ? '1px solid rgba(16,185,129,0.4)'
                      : '1px solid rgba(239,68,68,0.35)'
                    : '1px solid rgba(255,255,255,0.09)',
                  color:'rgba(255,255,255,0.9)'
                }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ background:'none',border:'none',cursor:'pointer',padding:0,color:'rgba(255,255,255,0.3)',display:'flex',alignItems:'center' }}>
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs mt-1.5" style={{ color:'#fca5a5' }}>Password tidak cocok</p>
            )}
            {confirmPassword.length > 0 && password === confirmPassword && (
              <p className="text-xs mt-1.5" style={{ color:'#34d399' }}>Password cocok</p>
            )}
          </div>

          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background:loading?'rgba(16,185,129,0.5)':'linear-gradient(135deg,#10b981 0%,#059669 100%)',boxShadow:'0 4px 20px rgba(16,185,129,0.42)' }}>
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
