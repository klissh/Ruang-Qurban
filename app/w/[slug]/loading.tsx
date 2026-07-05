// loading.tsx — ditampilkan oleh Next.js saat server component
// di halaman workspace sedang fetch data (navigasi antar menu dashboard)

export default function WorkspaceLoading() {
  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        height:         '100%',
        minHeight:      '60vh',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Spinner cincin */}
        <div
          style={{
            width:  44,
            height: 44,
            border: '3px solid rgba(16,185,129,0.15)',
            borderTop: '3px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Memuat data…
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
