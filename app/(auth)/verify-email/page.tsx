import { Moon, Mail } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(145deg, #030d07 0%, #091a0f 52%, #060e1a 100%)' }}
    >
      <div className="pointer-events-none fixed" style={{ top: '-20%', left: '-15%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 65%)' }} />

      <div className="w-full max-w-[400px] relative z-10 text-center">
        <div className="inline-flex mb-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Mail size={34} color="#34d399" strokeWidth={1.8} />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold mb-3" style={{ color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px' }}>
          Cek Email Anda
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Kami telah mengirimkan link verifikasi ke email Anda.<br />
          Klik link tersebut untuk menyelesaikan pendaftaran.
        </p>

        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', lineHeight: 1.8 }}>
            Tidak menerima email? Periksa folder Spam.<br />
            Link verifikasi berlaku selama 24 jam.
          </p>
        </div>

        <a href="/login" className="inline-block mt-6 text-sm font-semibold" style={{ color: '#34d399' }}>
          Kembali ke halaman masuk
        </a>
      </div>
    </div>
  )
}
