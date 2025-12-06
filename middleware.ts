// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req })

  // buat supabase client yang bisa baca cookie di middleware/edge
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = req.nextUrl.pathname

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
  matcher: ['/dashboard/:path*'],
}
