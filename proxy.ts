import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { ACCESS_SESSION_COOKIE_NAME, hasAccessSessionCookie } from '@/lib/auth/access'

const PUBLIC_EXACT_ROUTES = ['/login']
const PROTECTED_EXACT_ROUTES = ['/', '/dashboard', '/settings', '/logs']
const PROTECTED_PREFIX_ROUTES = ['/domains', '/sites', '/accounts']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAccess = await hasAccessSessionCookie(request.cookies.get(ACCESS_SESSION_COOKIE_NAME)?.value ?? null)

  if (isPublicRoute(pathname)) {
    if (!hasAccess) {
      return NextResponse.next()
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next()
  }

  if (hasAccess) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}

function isPublicRoute(pathname: string) {
  return PUBLIC_EXACT_ROUTES.includes(pathname)
}

function isProtectedRoute(pathname: string) {
  return PROTECTED_EXACT_ROUTES.includes(pathname)
    || PROTECTED_PREFIX_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
