import { hasAccessSession } from '@/lib/auth/access-server'

export async function getCurrentUserInfo() {
  const authorized = await hasAccessSession()

  return {
    displayName: authorized ? '已授权访问' : '访客模式',
    email: authorized ? '访问秘钥登录' : '未登录',
  }
}
