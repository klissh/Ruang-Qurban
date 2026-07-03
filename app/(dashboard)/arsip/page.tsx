import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Periode } from '@/types'

export default async function ArsipPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id_workspace')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: allPeriode } = await supabase
    .from('periode_qurban')
    .select('*')
    .eq('id_workspace', profile.id_workspace)
    .order('tahun', { ascending: false })

  const periode = (allPeriode ?? []) as Periode[]
  const arsipList = periode.filter((p) => p.status === 'arsip')
  const periodeAktif = periode.find((p) => p.status === 'aktif') ?? null
  const isSuperAdmin = profile.role === 'SUPER_ADMIN'

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-slide-up">

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.97)', letterSpacing: '-0.5px', margin: 0 }}>
          Arsip Periode Qurban
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 6 }}>
          {arsipList.length} periode terarsip &mdash; data read-only, tidak dapat diubah
        </p>
      </div>

      {/* Periode Aktif Info Card */}
      {periodeAktif ? (
        <div style={{
          marginBottom: 28, padding: '16px 20px', borderRadius: 14,
          background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', margin: 0, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Periode Aktif</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#34d399', margin: '2px 0 0' }}>
                {periodeAktif.nama_event ?? `Qurban ${periodeAktif.tahun}`}
              </p>
            </div>
          </div>
          <Link href="/hewan" style={{
            padding: '8px 16px', background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.22)', borderRadius: 9,
            color: '#34d399', fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
          }}>
            Buka Data Hewan
          </Link>
        </div>
      ) : (
        /* Tidak ada periode aktif — tampilkan tombol buat periode (SUPER_ADMIN) */
        isSuperAdmin && <BuatPeriodeCard />
      )}

      {/* Arsip list */}
      {arsipList.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)' }}>
            Belum ada periode yang diarsipkan.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {arsipList.map((p) => (
            <ArsipCard key={p.id} periode={p} isSuperAdmin={isSuperAdmin} tidakAdaAktif={!periodeAktif} />
          ))}
        </div>
      )}
    </div>
  )
}

function ArsipCard({ periode, isSuperAdmin, tidakAdaAktif }: { periode: Periode; isSuperAdmin: boolean; tidakAdaAktif: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderTop: '2px solid rgba(251,191,36,0.3)',
      borderRadius: 16, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.75)',
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 6, padding: '2px 8px', letterSpacing: '0.4px',
          }}>
            ARSIP {periode.tahun}
          </span>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
          {periode.nama_event ?? `Qurban ${periode.tahun}`}
        </h3>
        {periode.diarsipkan_pada && (
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>
            Diarsipkan {new Date(periode.diarsipkan_pada).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link href={`/arsip/${periode.tahun}`} style={{
          display: 'block', textAlign: 'center', padding: '9px 0',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600,
          textDecoration: 'none',
        }}>
          Lihat Detail Arsip
        </Link>
        {isSuperAdmin && tidakAdaAktif && (
          <BukaKembaliButton periodeId={periode.id} tahun={periode.tahun} />
        )}
      </div>
    </div>
  )
}

// Client components for interactive actions
function BuatPeriodeCard() {
  const tahunSekarang = new Date().getFullYear()
  return (
    <div style={{
      marginBottom: 28, padding: '20px 24px', borderRadius: 14,
      background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
        Tidak ada periode aktif. Buat periode baru untuk mulai input data qurban.
      </p>
      <Link href="/hewan" style={{
        display: 'inline-block', padding: '9px 20px',
        background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 10,
        color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none',
        boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
      }}>
        Buat Periode {tahunSekarang + 1}
      </Link>
    </div>
  )
}

function BukaKembaliButton({ periodeId, tahun }: { periodeId: string; tahun: number }) {
  // This is a server component context — we use a form action for unarchive
  return (
    <form action={`/api/periode/buka-kembali`} method="POST" style={{ display: 'none' }}>
      {/* Handled via client-side JS in ArsipDetailClient */}
    </form>
  )
}
