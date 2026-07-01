# Panduan Revisi — Ruang Qurban

## Ringkasan Perubahan

Terdapat **4 masalah utama** yang diperbaiki, plus perbaikan UI/UX glassmorphism.

---

## Bug Kritis #1 — Middleware tidak melindungi apa pun

### Masalah
```typescript
// middleware.ts LAMA — TIDAK BEKERJA!
if (!user && pathname.startsWith('/dashboard')) { ... }
```
Route dashboard Anda adalah `/analitik`, `/hewan`, `/status`, `/log`, `/panitia`.
**Tidak satu pun yang dimulai dengan `/dashboard`**, jadi kondisi ini tidak pernah terpicu.
Artinya semua halaman dashboard bisa diakses tanpa login (hanya dilindungi oleh layout/page saja).

### Perbaikan (`middleware.ts`)
```typescript
const PROTECTED_PAGE_PREFIXES = [
  '/analitik', '/hewan', '/status', '/log', '/panitia',
]
const PROTECTED_API_PREFIXES = [
  '/api/hewan', '/api/jamaah', '/api/panitia',
]
// Jika tidak login → redirect ke /login?from=/hewan (simpan tujuan)
// Jika API → kembalikan 401 JSON
```

---

## Bug #2 — Login tidak peduli role user

### Masalah
```typescript
// login/page.tsx LAMA
router.push('/analitik') // semua user diarahkan ke sini
```
PETUGAS_LAPANGAN diarahkan ke `/analitik` padahal mereka tidak punya akses ke sana
(langsung di-redirect lagi ke `/status` oleh server). Ini menyebabkan dua kali redirect
yang tidak perlu dan pengalaman yang membingungkan.

### Perbaikan (`app/(auth)/login/page.tsx`)
```typescript
// Setelah login, cek role terlebih dahulu:
if (from && from !== '/login') {
  destination = from          // kembali ke halaman asal (dari middleware)
} else if (role === 'PETUGAS_LAPANGAN') {
  destination = '/status'     // langsung ke halaman yang sesuai
} else {
  destination = '/analitik'   // admin & super admin
}
```

---

## Bug #3 — Sidebar menggunakan `<a>` bukan `<Link>`

### Masalah
```tsx
// Sidebar.tsx LAMA
<a href={item.href} ...>
```
Tag `<a>` biasa menyebabkan **full page reload** setiap kali berpindah menu.
Harusnya menggunakan `Link` dari Next.js untuk navigasi client-side.

### Perbaikan (`components/dashboard/Sidebar.tsx`)
```tsx
import Link from 'next/link'
<Link href={item.href} ...>
```

---

## Bug #4 — Tidak ada redirect jika sudah login ke `/login`

### Masalah
User yang sudah login bisa membuka `/login` dan melihat form login lagi.

### Perbaikan (ada di `middleware.ts` baru)
Middleware sekarang juga bisa menangani ini. Atau tambahkan di `login/page.tsx`:
```typescript
useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    if (data.user) router.replace('/analitik')
  })
}, [])
```

---

## Arsitektur Keamanan yang Direkomendasikan

```
Request masuk
     │
     ▼
┌─────────────────────────────────┐
│         MIDDLEWARE              │  ← Lapisan 1: cek sesi (edge, cepat)
│  - Cek apakah route protected   │    redirect ke /login jika belum login
│  - Rate limit /api/tracking     │    401 untuk protected API
│  - Simpan ?from= untuk redirect │
└─────────────────────────────────┘
     │ lolos
     ▼
┌─────────────────────────────────┐
│       DASHBOARD LAYOUT          │  ← Lapisan 2: defense-in-depth
│  - Verifikasi ulang sesi        │    (server component, akses DB)
│  - Ambil profile + role         │
│  - Kirim ke Sidebar             │
└─────────────────────────────────┘
     │ lolos
     ▼
┌─────────────────────────────────┐
│           PAGE                  │  ← Lapisan 3: RBAC per halaman
│  - Cek role user                │    redirect jika role tidak sesuai
│  - Fetch data workspace milik   │    Supabase RLS sebagai safety net
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│         SUPABASE RLS            │  ← Lapisan 4: DB-level security
│  - Row Level Security           │    data tidak bocor walau bypass API
└─────────────────────────────────┘
```

---

## Cara Menerapkan

Salin file-file berikut ke posisinya di project Anda:

| File hasil revisi | Salin ke |
|---|---|
| `middleware.ts` | `middleware.ts` (root) |
| `app/(auth)/login/page.tsx` | `app/(auth)/login/page.tsx` |
| `app/(dashboard)/layout.tsx` | `app/(dashboard)/layout.tsx` |
| `components/dashboard/Sidebar.tsx` | `components/dashboard/Sidebar.tsx` |
| `app/globals.css` | `app/globals.css` |

---

## UI/UX — Glassmorphism Dark Theme

`globals.css` yang baru menyediakan class-class utama:

| Class | Fungsi |
|---|---|
| `.glass` | Glass panel dasar |
| `.glass-card` | Card dengan hover effect |
| `.badge-persiapan` | Badge status Persiapan |
| `.badge-disembelih` | Badge status Disembelih |
| `.badge-pencacahan` | Badge status Pencacahan |
| `.badge-selesai` | Badge status Selesai |
| `.animate-fade-in` | Animasi muncul |
| `.animate-slide-up` | Animasi naik dari bawah |

Untuk halaman-halaman dashboard (analitik, hewan, status, log, panitia),
ganti class Tailwind `bg-white`, `border-gray-100`, `text-gray-*` dengan class glass di atas,
atau gunakan inline style glassmorphism seperti yang diterapkan di login dan sidebar.

---

## Alur Website Setelah Perbaikan

```
/ (root)
 ├─ sudah login → /analitik atau /status (sesuai role)
 └─ belum login → /login

/login
 ├─ login sukses (SUPER_ADMIN / ADMIN_PENDAFTARAN) → /analitik
 ├─ login sukses (PETUGAS_LAPANGAN) → /status
 └─ ada ?from= → kembali ke halaman asal

/analitik, /hewan, /log, /panitia  (protected)
 ├─ belum login → middleware redirect ke /login?from=...
 └─ role PETUGAS_LAPANGAN → redirect ke /status

/status  (protected)
 ├─ belum login → middleware redirect ke /login?from=/status
 └─ semua role bisa akses

/tracking  (public)
 └─ siapapun bisa akses, rate limited 10 req/menit per IP

/api/hewan, /api/jamaah, /api/panitia  (protected API)
 └─ belum login → middleware 401 JSON
```
