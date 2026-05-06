import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import {
  ACCESS_SESSION_COOKIE_NAME,
  createAccessSessionValue,
  getAccessSessionMaxAgeSeconds,
  readAccessSessionFromCookieValue,
} from '@/lib/auth/access'

export async function createAccessSession() {
  const cookieStore = await cookies()

  cookieStore.set(ACCESS_SESSION_COOKIE_NAME, await createAccessSessionValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getAccessSessionMaxAgeSeconds(),
  })
}

export async function clearAccessSession() {
  const cookieStore = await cookies()

  cookieStore.set(ACCESS_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function readAccessSession() {
  const cookieStore = await cookies()

  return readAccessSessionFromCookieValue(cookieStore.get(ACCESS_SESSION_COOKIE_NAME)?.value ?? null)
}

export async function hasAccessSession() {
  return (await readAccessSession()) !== null
}

export async function requireAccess() {
  if (!(await hasAccessSession())) {
    throw new Error('无权限访问')
  }
}

export async function requirePageAccess() {
  if (!(await hasAccessSession())) {
    redirect('/login')
  }
}
