'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Mail, Lock, User, Hash, Eye, EyeOff } from 'lucide-react'

const BG = 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)'

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 40)
}

export default function RegisterWorkspacePage() {
  const router   = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    nama: '', email: '', password: '', confirmPassword: '', namaWorkspace: '', slug: '',
  })
  const [showPw, setShowPw]           = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [slugManual, setSlugManual]   = useState(false)
  const [slugStatus, setSlugStatus]   = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleNamaWorkspace(val: string) {
    setForm((f) => ({ ...f, namaWorkspace: val, slug: slugManual ? f.slug : slugify(val) }))
  }

  useEffect(() => {
    if (!form.slug) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    if (slugDebounce.current) clearTimeout(slugDebounce.current)
    slugDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-slug?slug=${encodeURIComponent(form.slug)}`)
        const { available } = await res.json()
        setSlugStatus(available ? 'available' : 'taken')
      } catch { setSlugStatus('idle') }
    }, 600)
  }, [form.slug])

  async function handleDaftar() {
    if (!form.nama || !form.email || !form.password || !form.confirmPassword || !form.namaWorkspace || !form.slug) {
      setError('Semua field wajib diisi'); return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter'); return
    }
    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok'); return
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setError('Slug hanya boleh huruf kecil, angka, dan tanda hubung'); return
    }

    setError('')
    setLoading(true)

    try {
      const slugCheck = await fetch(`/api/check-slug?slug=${encodeURIComponent(form.slug)}`)
      const { available } = await slugCheck.json()
      if (!available) {
        setError(`Slug "${form.slug}" sudah dipakai workspace lain. Gunakan nama masjid yang berbeda.`)
        setLoading(false); return
      }
    } catch { /* lanjutkan */ }

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          nama_lengkap: form.nama,
          is_workspace_creator: true,
          pending_workspace_name: form.namaWorkspace,
          pending_workspace_slug: form.slug,
        },
      },
    })

    if (signUpError) {
      console.error('SignUp error:', JSON.stringify(signUpError))
      const msg    = typeof signUpError.message === 'string' ? signUpError.message.toLowerCase() : ''
      const code   = ((signUpError as any).code   ?? '').toLowerCase()
      const status = (signUpError as any).status  ?? 0
      const name   = ((signUpError as any).name   ?? '').toLowerCase()

      if (status === 500 || name.includes('retryfetch') || name.includes('retryable') || msg === '{}') {
        setError('Layanan email konfirmasi sedang bermasalah. Kemungkinan email Anda sudah pernah terdaftar — coba klik "Sudah punya akun" dan masuk, atau coba lagi beberapa menit kemudian.')
      } else if (code.includes('user_already') || code.includes('email_exists') || msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        setError('Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.')
      } else if (code.includes('email_not_confirmed') || msg.includes('not confirmed')) {
        setError('Email belum dikonfirmasi. Cek kotak masuk Anda.')
      } else if (code.includes('signup_disabled') || msg.includes('signup')) {
        setError('Pendaftaran akun baru sedang dinonaktifkan.')
      } else if (status === 429 || code.includes('rate') || msg.includes('rate limit') || msg.includes('too many')) {
        setError('Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.')
      } else if (msg.includes('invalid email') || (msg.includes('email') && !msg.includes('confirm'))) {
        setError('Format email tidak valid.')
      } else if (msg.includes('password') || msg.includes('weak') || status === 422) {
        setError('Password terlalu lemah atau format tidak valid. Gunakan minimal 6 karakter.')
      } else {
        const rawMsg = signUpError.message || code || `status ${status}`
        setError(rawMsg && rawMsg !== '{}'
          ? `Gagal membuat akun: ${rawMsg}`
          : 'Terjadi kesalahan tak terduga. Coba lagi atau hubungi admin.')
      }
      setLoading(false); return
    }

    router.push('/verify-email')
  }

  const inputBase: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.9)',
    borderRadius: 12, padding: '11px 42px 11px 42px', fontSize: 13.5, outline: 'none',
  }
  const inputNoRightPad: React.CSSProperties = { ...inputBase, padding: '11px 14px 11px 42px' }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="pointer-events-none fixed" style={{ top: '-20%', left: '-15%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 65%)' }} />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#ffffff', boxShadow: '0 0 0 1px rgba(16,185,129,0.28), 0 8px 40px rgba(0,0,0,0.35)', padding: '8px' }}>
              <img src="/logo.png" alt="Ruang Qurban" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          <h1 className="text-xl font-extrabold" style={{ color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px' }}>Buat Workspace Masjid</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Anda akan menjadi Super Admin workspace ini</p>
        </div>

        {/* Card */}
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
                placeholder="Ahmad Fauzi" style={inputNoRightPad} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="admin@masjid.com" style={inputNoRightPad} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={(e) => set('password', e.target.value)}
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
                placeholder="Ulangi password"
                style={{
                  ...inputBase,
                  borderColor: form.confirmPassword
                    ? form.confirmPassword === form.password ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'
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

          {/* Nama Workspace */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>Nama Masjid / Workspace</label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
              <input type="text" value={form.namaWorkspace}
                onChange={(e) => handleNamaWorkspace(e.target.value)}
                placeholder="Masjid Al-Ikhlas" style={inputNoRightPad} />
            </div>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Slug Workspace
              <span className="ml-2 font-normal normal-case" style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10 }}>
                (dipakai di URL: /w/<strong>{form.slug || 'nama-masjid'}</strong>)
              </span>
            </label>
            <div className="relative">
              <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
              <input type="text" value={form.slug}
                onChange={(e) => { setSlugManual(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })) }}
                placeholder="masjid-al-ikhlas"
                style={{
                  ...inputNoRightPad,
                  borderColor: slugStatus === 'taken' ? 'rgba(239,68,68,0.5)' : slugStatus === 'available' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.09)',
                }} />
            </div>
            {form.slug && (
              <p style={{ fontSize: 11.5, marginTop: 6, fontWeight: 600,
                color: slugStatus === 'taken' ? '#fca5a5' : slugStatus === 'available' ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                {slugStatus === 'checking'  && '⏳ Memeriksa ketersediaan...'}
                {slugStatus === 'available' && '✓ Slug tersedia — URL: /w/' + form.slug}
                {slugStatus === 'taken'     && '✗ Slug sudah dipakai workspace lain'}
                {slugStatus === 'idle'      && '/w/' + form.slug}
              </p>
            )}
          </div>

          <button
            onClick={handleDaftar}
            disabled={loading || slugStatus === 'taken'}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 mt-2"
            style={{ background: loading || slugStatus === 'taken' ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 20px rgba(16,185,129,0.42)' }}
          >
            {loading ? 'Membuat Workspace...' : 'Buat Workspace & Daftar'}
          </button>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.28)' }}>
          <a href="/register" style={{ color: '#34d399' }}>Kembali</a> · <a href="/login" style={{ color: '#34d399' }}>Sudah punya akun</a>
        </p>
      </div>
    </div>
  )
}
