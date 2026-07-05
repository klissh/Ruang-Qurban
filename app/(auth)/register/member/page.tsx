'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

const BG = 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)'

export default function RegisterMemberPage() {
  const router  = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ nama: '', email: '', password: '', confirmPassword: '' })
  const [showPw, setShowPw]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleDaftar() {
    if (!form.nama || !form.email || !form.password || !form.confirmPassword) {
      setError('Semua field wajib diisi'); return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter'); return
    }
    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok'); return
    }
    setError('')
    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { nama_lengkap: form.nama },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    router.push('/verify-email')
  }

  const inputBase: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.9)',
    borderRadius: 12, padding: '11px 42px 11px 42px', fontSize: 13.5, outline: 'none',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="pointer-events-none fixed" style={{ top: '-20%', left: '-15%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 65%)' }} />

      <div className="w-full max-w-[400px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#ffffff', boxShadow: '0 0 0 1px rgba(16,185,129,0.28), 0 8px 40px rgba(0,0,0,0.35)', padding: '8px' }}>
              <img src="/logo.png" alt="Ruang Qurban" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          <h1 className="text-xl font-extrabold" style={{ color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px' }}>Daftar sebagai Anggota</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Super Admin workspace akan menambahkan Anda</p>
        </div>

        <div className="rounded-3xl p-7 space-y-4" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(32px) saturate(150%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.38)' }}>
          {error && (
            <div className="text-sm rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {/* Nama */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>Nama Lengkap</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
              <input type="text" value={form.nama} onChange={(e) => set('nama', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDaftar()}
                placeholder="Nama Anda" style={{ ...inputBase, padding: '11px 14px 11px 42px' }} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDaftar()}
                placeholder="email@contoh.com" style={{ ...inputBase, padding: '11px 14px 11px 42px' }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={(e) => set('password', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDaftar()}
                placeholder="Min. 6 karakter" style={inputBase} />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>Konfirmasi Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
              <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDaftar()}
                placeholder="Ulangi password"
                style={{
                  ...inputBase,
                  borderColor: form.confirmPassword
                    ? form.confirmPassword === form.password
                      ? 'rgba(16,185,129,0.4)'
                      : 'rgba(239,68,68,0.4)'
                    : 'rgba(255,255,255,0.09)',
                }} />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {form.confirmPassword && form.confirmPassword !== form.password && (
              <p style={{ fontSize: 11.5, marginTop: 5, color: '#fca5a5', fontWeight: 500 }}>Password tidak cocok</p>
            )}
            {form.confirmPassword && form.confirmPassword === form.password && (
              <p style={{ fontSize: 11.5, marginTop: 5, color: '#34d399', fontWeight: 500 }}>✓ Password cocok</p>
            )}
          </div>

          <button
            onClick={handleDaftar}
            disabled={loading}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 mt-2"
            style={{ background: loading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 20px rgba(16,185,129,0.42)' }}
          >
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.28)' }}>
          <a href="/register" style={{ color: '#34d399' }}>Kembali</a> · <a href="/login" style={{ color: '#34d399' }}>Sudah punya akun</a>
        </p>
      </div>
    </div>
  )
}
