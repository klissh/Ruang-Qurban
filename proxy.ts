import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/verify-email',
  '/auth/callback',
  '/tracking',
  '/api/tracking',
  '/_next',
  '/favicon',
]

const PROTECTED_PAGE_PREFIXES = ['/w/', '/waiting']
const PROTECTED_API_PREFIXES  = [
  '/api/hewan', '/api/jamaah', '/api/panitia',
  '/api/periode', '/api/pengantaran', '/api/import', '/api/workspace',
]

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

// Next.js 16: export harus bernama "proxy" (bukan "middleware")
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/tracking')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
    }
  }

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/'
  if (isPublic) return NextResponse.next()

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p))
  const isProtectedApi  = PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p))
  if (!isProtectedPage && !isProtectedApi) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (isProtectedApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
