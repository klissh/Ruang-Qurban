'use client'

import { useRouter } from 'next/navigation'
import { Moon, Building2, User } from 'lucide-react'

const BG = 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: BG }}
    >
      {/* Orbs */}
      <div className="pointer-events-none fixed" style={{ top: '-20%', left: '-15%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 65%)' }} />
      <div className="pointer-events-none fixed" style={{ bottom: '-25%', right: '-10%', width: 800, height: 800, background: 'radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 65%)' }} />

      <div className="w-full max-w-[420px] relative z-10">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex relative mb-5">
            <div className="w-[74px] h-[74px] rounded-3xl flex items-center justify-center" style={{ background: '#ffffff', boxShadow: '0 0 0 1px rgba(16,185,129,0.28), 0 8px 40px rgba(0,0,0,0.35)', padding: '10px' }}>
              <img src="/logo.png" alt="Ruang Qurban" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px' }}>
            Daftar ke Portal Qurban
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Pilih jenis pendaftaran Anda
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 space-y-4" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(32px) saturate(150%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.38)' }}>

          {/* Opsi Buat Workspace */}
          <button
            onClick={() => router.push('/register/workspace')}
            className="w-full rounded-2xl p-5 text-left transition-all group"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <Building2 size={22} color="#34d399" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>Buat Workspace Masjid</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Saya administrator — buat workspace baru untuk masjid saya
                </p>
              </div>
            </div>
          </button>

          {/* Opsi Daftar Biasa */}
          <button
            onClick={() => router.push('/register/member')}
            className="w-full rounded-2xl p-5 text-left transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', cursor: 'pointer' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <User size={22} color="rgba(255,255,255,0.5)" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>Daftar sebagai Anggota</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Saya panitia — Super Admin akan menambahkan saya ke workspace
                </p>
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.28)' }}>
          Sudah punya akun?{' '}
          <a href="/login" className="font-semibold" style={{ color: '#34d399' }}>Masuk</a>
        </p>
      </div>
    </div>
  )
}
