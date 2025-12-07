// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req })

  const pathname = req.nextUrl.pathname

  // Skip middleware for auth paths to avoid interfering with OAuth callback
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
    return res
  }

  // Public paths that don't require authentication
  const publicPaths = ['/', '/properties', '/privacy-policy', '/terms-of-service', '/forgot-password']
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith('/properties/'))

  if (isPublicPath) {
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

  // Role-based access control
  if (isDashboard && user) {
    // Get user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role

    // Agent dashboard access
    if (pathname.startsWith('/dashboard/agent')) {
      // Check if user is approved agent
      const { data: agent } = await supabase
        .from('agents')
        .select('status')
        .eq('email', user.email)
        .single()

      if (!agent || agent.status !== 'approved') {
        return NextResponse.redirect(new URL('/forbidden', req.url))
      }
    }

    // Admin dashboard access
    if (pathname.startsWith('/dashboard/admin')) {
      if (!userRole || !['admin', 'super_admin'].includes(userRole)) {
        return NextResponse.redirect(new URL('/forbidden', req.url))
      }
    }

    // User dashboard access (if exists in future)
    if (pathname.startsWith('/dashboard/user')) {
      if (!userRole || userRole !== 'user') {
        return NextResponse.redirect(new URL('/forbidden', req.url))
      }
    }
  }

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
