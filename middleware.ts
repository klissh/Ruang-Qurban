import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─────────────────────────────────────────────
// Route definitions
// ─────────────────────────────────────────────

// Rute halaman yang wajib login
const PROTECTED_PAGE_PREFIXES = [
  '/analitik',
  '/hewan',
  '/status',
  '/log',
  '/panitia',
]

// Rute API yang wajib login
// (api/tracking sengaja dikecualikan — itu public)
const PROTECTED_API_PREFIXES = [
  '/api/hewan',
  '/api/jamaah',
  '/api/panitia',
]

// Rute yang boleh diakses tanpa login
const PUBLIC_PREFIXES = [
  '/tracking',
  '/login',
  '/api/tracking',
  '/_next',
  '/favicon',
]

// ─────────────────────────────────────────────
// Rate limiter (in-memory, ganti Redis di prod)
// ─────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Rate limiting untuk endpoint tracking publik
  if (pathname.startsWith('/api/tracking')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.' },
        { status: 429 }
      )
    }
  }

  // 2. Rute yang selalu boleh diakses — langsung lanjut
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/'
  if (isPublic) return NextResponse.next()

  // 3. Cek apakah rute ini memerlukan autentikasi
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p))
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p))

  if (!isProtectedPage && !isProtectedApi) {
    // Rute tidak dikenal — biarkan Next.js tangani (404, dll.)
    return NextResponse.next()
  }

  // 4. Buat Supabase client & ambil user dari session
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 5. Tidak ada sesi → tolak akses
  if (!user) {
    if (isProtectedApi) {
      // API route → kembalikan JSON 401
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Halaman → redirect ke login, simpan tujuan asli di query param
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 6. Ada sesi → izinkan akses, teruskan cookies yang diperbarui
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
