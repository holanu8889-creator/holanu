// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req })

  const pathname = req.nextUrl.pathname

  // Skip middleware for auth paths to avoid interfering with OAuth callback
  if (pathname.startsWith('/auth/')) {
    return res
  }

  // buat supabase client yang bisa baca cookie di middleware/edge
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // protection rules
  const isDashboard = pathname.startsWith('/dashboard')

  if (isDashboard && !user) {
    // redirect to login if not authenticated
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // you can add more role checks here later

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
