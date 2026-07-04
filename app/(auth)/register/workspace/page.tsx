'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Moon, Building2, Mail, Lock, User, Hash } from 'lucide-react'

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
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ nama: '', email: '', password: '', namaWorkspace: '', slug: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleNamaWorkspace(val: string) {
    setForm((f) => ({
      ...f,
      namaWorkspace: val,
      slug: slugManual ? f.slug : slugify(val),
    }))
  }

  // Cek slug secara real-time (debounce 600ms)
  useEffect(() => {
    if (!form.slug) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    if (slugDebounce.current) clearTimeout(slugDebounce.current)
    slugDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-slug?slug=${encodeURIComponent(form.slug)}`)
        const { available } = await res.json()
        setSlugStatus(available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 600)
  }, [form.slug])

  async function handleDaftar() {
    if (!form.nama || !form.email || !form.password || !form.namaWorkspace || !form.slug) {
      setError('Semua field wajib diisi')
      return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setError('Slug hanya boleh huruf kecil, angka, dan tanda hubung')
      return
    }

    setError('')
    setLoading(true)

    // Cek ketersediaan slug sebelum daftar
    try {
      const slugCheck = await fetch(`/api/check-slug?slug=${encodeURIComponent(form.slug)}`)
      const { available } = await slugCheck.json()
      if (!available) {
        setError(`Slug "${form.slug}" sudah dipakai workspace lain. Gunakan nama masjid yang berbeda.`)
        setLoading(false)
        return
      }
    } catch {
      // Lanjutkan jika pengecekan gagal — validasi tetap ada di DB
    }

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
      // Terjemahkan error Supabase ke pesan yang ramah
      const msg = typeof signUpError.message === 'string' ? signUpError.message.toLowerCase() : ''
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        setError('Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.')
      } else if (msg.includes('invalid email') || msg.includes('email')) {
        setError('Format email tidak valid.')
      } else if (msg.includes('password') || msg.includes('weak')) {
        setError('Password terlalu lemah. Gunakan minimal 6 karakter.')
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.')
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError('Koneksi bermasalah. Periksa internet Anda.')
      } else if (msg && msg !== '{}' && msg !== 'undefined') {
        setError(signUpError.message)
      } else {
        setError('Terjadi kesalahan saat membuat akun. Coba lagi.')
      }
      setLoading(false)
      return
    }

    router.push('/verify-email')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.9)',
    borderRadius: 12, padding: '11px 14px 11px 42px', fontSize: 13.5, outline: 'none',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="pointer-events-none fixed" style={{ top: '-20%', left: '-15%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 65%)' }} />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #12c98d 0%, #059669 100%)', boxShadow: '0 0 0 1px rgba(16,185,129,0.28), 0 8px 40px rgba(16,185,129,0.42)' }}>
              <Building2 size={26} color="white" strokeWidth={2.2} />
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

          {[
            { field: 'nama', label: 'Nama Lengkap', type: 'text', placeholder: 'Ahmad Fauzi', Icon: User },
            { field: 'email', label: 'Email', type: 'email', placeholder: 'admin@masjid.com', Icon: Mail },
            { field: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter', Icon: Lock },
            { field: 'namaWorkspace', label: 'Nama Masjid / Workspace', type: 'text', placeholder: 'Masjid Al-Ikhlas', Icon: Moon, onChange: handleNamaWorkspace },
          ].map(({ field, label, type, placeholder, Icon, onChange }) => (
            <div key={field}>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>{label}</label>
              <div className="relative">
                <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
                <input
                  type={type}
                  value={(form as any)[field]}
                  onChange={(e) => onChange ? onChange(e.target.value) : setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={placeholder}
                  style={inputStyle}
                />
              </div>
            </div>
          ))}

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
              <input
                type="text"
                value={form.slug}
                onChange={(e) => { setSlugManual(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })) }}
                placeholder="masjid-al-ikhlas"
                style={{ ...inputStyle, borderColor: slugStatus === 'taken' ? 'rgba(239,68,68,0.5)' : slugStatus === 'available' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.09)' }}
              />
            </div>
            {/* Slug status indicator */}
            {form.slug && (
              <p style={{ fontSize: 11.5, marginTop: 6, fontWeight: 600,
                color: slugStatus === 'taken' ? '#fca5a5' : slugStatus === 'available' ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                {slugStatus === 'checking' && '⏳ Memeriksa ketersediaan...'}
                {slugStatus === 'available' && '✓ Slug tersedia — URL: /w/' + form.slug}
                {slugStatus === 'taken' && '✗ Slug sudah dipakai workspace lain'}
                {slugStatus === 'idle' && '/w/' + form.slug}
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
