'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

const BG = 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)

  async function handleSend() {
    if (!email) { setError('Email wajib diisi'); return }
    setError('')
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (resetError) {
      setError('Gagal mengirim email. Periksa kembali alamat email Anda.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
        <div className="pointer-events-none fixed" style={{ top:'-20%',left:'-15%',width:700,height:700,background:'radial-gradient(circle,rgba(16,185,129,0.13) 0%,transparent 65%)' }} />
        <div className="w-full max-w-[400px] relative z-10 text-center">
          <div className="inline-flex mb-8">
            <div className="w-[74px] h-[74px] rounded-3xl flex items-center justify-center" style={{ background:'#ffffff',boxShadow:'0 0 0 1px rgba(16,185,129,0.28),0 8px 40px rgba(0,0,0,0.35)',padding:'10px' }}>
              <img src="/logo.png" alt="Ruang Qurban" style={{ width:'100%',height:'100%',objectFit:'contain' }} />
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle size={28} color="#34d399" />
          </div>
          <h2 className="text-xl font-extrabold mb-3" style={{ color:'rgba(255,255,255,0.95)',letterSpacing:'-0.4px' }}>
            Email Terkirim
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color:'rgba(255,255,255,0.38)' }}>
            Link reset password telah dikirim ke<br />
            <span style={{ color:'#34d399',fontWeight:600 }}>{email}</span>
          </p>
          <div className="rounded-2xl p-4" style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs" style={{ color:'rgba(255,255,255,0.28)',lineHeight:1.8 }}>
              Tidak menerima email? Periksa folder Spam.<br />
              Link berlaku selama 24 jam.
            </p>
          </div>
          <a href="/login" className="inline-flex items-center gap-2 mt-7 text-sm font-semibold" style={{ color:'rgba(255,255,255,0.35)' }}>
            <ArrowLeft size={14} /> Kembali ke halaman masuk
          </a>
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
            Lupa Password?
          </h1>
          <p className="text-sm mt-2" style={{ color:'rgba(255,255,255,0.35)' }}>
            Masukkan email Anda untuk mereset password
          </p>
        </div>

        <div className="rounded-3xl p-8"
          style={{ background:'rgba(255,255,255,0.07)',backdropFilter:'blur(32px) saturate(150%)',WebkitBackdropFilter:'blur(32px) saturate(150%)',border:'1px solid rgba(255,255,255,0.1)',borderTop:'1px solid rgba(255,255,255,0.2)',boxShadow:'0 24px 64px rgba(0,0,0,0.38)' }}>

          <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color:'rgba(255,255,255,0.38)',letterSpacing:'0.8px' }}>
            Reset Kata Sandi
          </p>

          {error && (
            <div className="text-sm rounded-xl px-4 py-3 mb-5"
              style={{ background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',color:'#fca5a5' }}>
              {error}
            </div>
          )}

          <div className="mb-7">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color:'rgba(255,255,255,0.38)',letterSpacing:'0.8px' }}>Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:'rgba(255,255,255,0.24)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="panitia@masjid.com"
                className="w-full rounded-xl pl-11 pr-4 py-3 text-sm outline-none"
                style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',color:'rgba(255,255,255,0.9)' }}
              />
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background:loading?'rgba(16,185,129,0.5)':'linear-gradient(135deg,#10b981 0%,#059669 100%)',boxShadow:'0 4px 20px rgba(16,185,129,0.42)' }}>
            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
          </button>
        </div>

        <div className="text-center mt-6">
          <a href="/login" className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color:'rgba(255,255,255,0.35)' }}>
            <ArrowLeft size={14} /> Kembali ke halaman masuk
          </a>
        </div>
      </div>
    </div>
  )
}
