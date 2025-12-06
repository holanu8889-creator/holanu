import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes and their required roles
const protectedRoutes = {
  '/dashboard': ['user', 'agent', 'admin'], // General dashboard accessible by all authenticated users
  '/dashboard/agent': ['agent'],
  '/dashboard/admin': ['admin'],
  '/dashboard/user': ['user'],
}

// Public routes that don't require authentication
const publicRoutes = ['/', '/login']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Create Supabase client for middleware
  const supabase = createMiddlewareClient({ req, res })

  // Get the current session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Allow access to public routes without authentication
  if (publicRoutes.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return res
  }

  // If no session exists, redirect to login
  if (!session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname) // Preserve the intended destination
    return NextResponse.redirect(loginUrl)
  }

  // Get user role from session metadata
  // Assuming role is stored in user_metadata.role
  const userRole = session.user?.user_metadata?.role || 'user'
  const agentStatus = session.user?.user_metadata?.agent_status // 'pending', 'approved', etc.

  // Check if accessing agent routes and status is pending
  if (pathname.startsWith('/dashboard/agent') && agentStatus === 'pending') {
    const statusUrl = new URL('/dashboard/agent/status', req.url)
    return NextResponse.redirect(statusUrl)
  }

  // Check role-based access for protected routes
  for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(userRole)) {
        // User doesn't have required role, redirect to forbidden page
        const forbiddenUrl = new URL('/forbidden', req.url)
        return NextResponse.redirect(forbiddenUrl)
      }
      break // Found matching route, no need to check further
    }
  }

  // If accessing general dashboard, redirect based on role
  if (pathname === '/dashboard') {
    if (userRole === 'agent') {
      if (agentStatus === 'pending') {
        const statusUrl = new URL('/dashboard/agent/status', req.url)
        return NextResponse.redirect(statusUrl)
      } else {
        const agentUrl = new URL('/dashboard/agent', req.url)
        return NextResponse.redirect(agentUrl)
      }
    } else if (userRole === 'admin') {
      const adminUrl = new URL('/dashboard/admin', req.url)
      return NextResponse.redirect(adminUrl)
    } else {
      const userUrl = new URL('/dashboard/user', req.url)
      return NextResponse.redirect(userUrl)
    }
  }

  // Allow access if all checks pass
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}