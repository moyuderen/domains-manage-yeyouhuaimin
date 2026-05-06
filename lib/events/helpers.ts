import 'server-only'

import type { ActivityLogAction, ActivityLogDetail } from '@/types/activity-log'
import type { ActivityRequestContext, ResolvedEventInput } from '@/lib/events/types'

export function getActivityRequestContext(headers: Headers): ActivityRequestContext {
  const userAgent = headers.get('user-agent')?.trim() ?? ''

  return {
    ip: readClientIp(headers),
    userAgent,
    os: parseOperatingSystem(userAgent),
    browser: parseBrowser(userAgent),
  }
}

export function getActivityIp(headers: Headers) {
  return readClientIp(headers)
}

export function buildAuthActivityDetail(context: ActivityRequestContext): ActivityLogDetail {
  return {
    ip: context.ip,
    userAgent: context.userAgent,
    os: context.os,
    browser: context.browser,
  }
}

export function getEventSourceInfo(event: Pick<ResolvedEventInput, 'requestContext' | 'detail' | 'ip'>): Pick<ActivityRequestContext, 'ip' | 'os' | 'browser'> {
  return {
    ip: readContextString(event.requestContext, 'ip') || readContextString(event.detail, 'ip') || event.ip,
    os: readContextString(event.requestContext, 'os') || readContextString(event.detail, 'os'),
    browser: readContextString(event.requestContext, 'browser') || readContextString(event.detail, 'browser'),
  }
}

export function buildActivitySummary(action: Exclude<ActivityLogAction, 'login' | 'login_failed' | 'logout'>, label: string, resourceName: string) {
  if (action === 'create') return `新增${label} ${resourceName}`
  if (action === 'delete') return `删除${label} ${resourceName}`
  return `编辑${label} ${resourceName}`
}

export function buildSettingsSummary(resourceName: string) {
  return `编辑设置 ${resourceName}`
}

function readContextString(source: Record<string, unknown> | undefined, key: 'ip' | 'os' | 'browser') {
  const value = source?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readClientIp(headers: Headers) {
  const candidates = [
    ...splitForwardedIps(headers.get('x-forwarded-for')),
    ...splitForwardedIps(headers.get('x-real-ip')),
    ...splitForwardedIps(headers.get('cf-connecting-ip')),
    ...splitForwardedIps(headers.get('x-vercel-forwarded-for')),
  ]

  for (const candidate of candidates) {
    const normalized = normalizeClientIp(candidate)
    if (normalized && !isLoopbackIp(normalized)) {
      return normalized
    }
  }

  for (const candidate of candidates) {
    const normalized = normalizeClientIp(candidate)
    if (normalized) {
      return normalized
    }
  }

  return ''
}

function splitForwardedIps(value: string | null) {
  if (!value) return []

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeClientIp(value: string) {
  const bracketMatch = value.match(/^\[([^\]]+)\](?::\d+)?$/)
  const withoutBrackets = bracketMatch ? bracketMatch[1] : value
  const withoutPort = withoutBrackets.match(/^\d+\.\d+\.\d+\.\d+:\d+$/)
    ? withoutBrackets.replace(/:\d+$/, '')
    : withoutBrackets

  return withoutPort.startsWith('::ffff:') ? withoutPort.slice(7) : withoutPort
}

function isLoopbackIp(value: string) {
  return value === '::1' || value === '127.0.0.1'
}

function parseOperatingSystem(userAgent: string) {
  if (!userAgent) return '未知设备'
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac OS X')) return 'macOS'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) return 'iOS'
  if (userAgent.includes('Linux')) return 'Linux'
  return '其他设备'
}

function parseBrowser(userAgent: string) {
  if (!userAgent) return '未知浏览器'
  if (userAgent.includes('Edg/')) return extractBrowserVersion(userAgent, 'Edg/', 'Edge')
  if (userAgent.includes('Chrome/')) return extractBrowserVersion(userAgent, 'Chrome/', 'Chrome')
  if (userAgent.includes('Firefox/')) return extractBrowserVersion(userAgent, 'Firefox/', 'Firefox')
  if (userAgent.includes('Safari/') && userAgent.includes('Version/')) return extractBrowserVersion(userAgent, 'Version/', 'Safari')
  return '其他浏览器'
}

function extractBrowserVersion(userAgent: string, marker: string, browserName: string) {
  const versionPart = userAgent.split(marker)[1]?.split(/[\s.)]/)[0]
  if (!versionPart) return browserName

  const majorVersion = versionPart.split('.')[0]
  return majorVersion ? `${browserName} ${majorVersion}` : browserName
}
