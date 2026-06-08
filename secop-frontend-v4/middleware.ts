import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('secop_token')
  const rol = request.cookies.get('secop_rol')
  const path = request.nextUrl.pathname

  if (path.startsWith('/dashboard')) {
    if (rol?.value !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (path.startsWith('/cliente')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/cliente/:path*']
}
