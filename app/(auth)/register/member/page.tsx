'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Moon, Mail, Lock, User } from 'lucide-react'

const BG = 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)'

export default function RegisterMemberPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ nama: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDaftar() {
    if (!form.nama || !form.email || !form.password) {
      setError('Semua field wajib diisi')
      return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter')
      return
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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.9)',
    borderRadius: 12, padding: '11px 14px 11px 42px', fontSize: 13.5, outline: 'none',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="pointer-events-none fixed" style={{ top: '-20%', left: '-15%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 65%)' }} />

      <div className="w-full max-w-[400px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #12c98d 0%, #059669 100%)', boxShadow: '0 0 0 1px rgba(16,185,129,0.28), 0 8px 40px rgba(16,185,129,0.42)' }}>
              <User size={26} color="white" strokeWidth={2.2} />
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

          {[
            { field: 'nama', label: 'Nama Lengkap', type: 'text', placeholder: 'Nama Anda', Icon: User },
            { field: 'email', label: 'Email', type: 'email', placeholder: 'email@contoh.com', Icon: Mail },
            { field: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter', Icon: Lock },
          ].map(({ field, label, type, placeholder, Icon }) => (
            <div key={field}>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>{label}</label>
              <div className="relative">
                <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.24)' }} />
                <input
                  type={type}
                  value={(form as any)[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleDaftar()}
                  placeholder={placeholder}
                  style={inputStyle}
                />
              </div>
            </div>
          ))}

          <button
            onClick={handleDaftar}
            disabled={loading}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 mt-2"
            style={{ background: loading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 20px rgba(16,185,129,0.42)' }}
          
                    suppressHydrationWarning>
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
