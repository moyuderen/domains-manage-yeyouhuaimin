'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { verifyAccessKey } from '@/lib/auth/access'
import { clearAccessSession, createAccessSession } from '@/lib/auth/access-server'
import { tryEmitEvent } from '@/lib/events'
import { buildAuthActivityDetail, getActivityRequestContext } from '@/lib/events/helpers'

export async function loginWithAccessKeyAction(secret: string) {
  const value = secret.trim()

  if (!value) {
    throw new Error('请输入访问秘钥')
  }

  const requestContext = getActivityRequestContext(await headers())
  const isValid = await verifyAccessKey(value)

  if (!isValid) {
    await tryEmitEvent({
      category: 'auth',
      action: 'login_failed',
      resourceType: 'auth',
      resourceId: 'access_key',
      summary: '登录失败',
      detail: buildAuthActivityDetail(requestContext),
      requestContext,
      severity: 'critical',
      result: 'failure',
    })
    throw new Error('访问秘钥不正确')
  }

  await createAccessSession()
  await tryEmitEvent({
    category: 'auth',
    action: 'login',
    resourceType: 'auth',
    resourceId: 'access_session',
    summary: '登录成功',
    detail: buildAuthActivityDetail(requestContext),
    requestContext,
    result: 'success',
  })
  revalidatePath('/logs')
}

export async function logoutAction() {
  const requestContext = getActivityRequestContext(await headers())

  await clearAccessSession()
  await tryEmitEvent({
    category: 'auth',
    action: 'logout',
    resourceType: 'auth',
    resourceId: 'access_session',
    summary: '退出登录',
    detail: buildAuthActivityDetail(requestContext),
    requestContext,
    result: 'success',
  })
  revalidatePath('/logs')
}
