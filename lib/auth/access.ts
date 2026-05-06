const DEFAULT_ACCESS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8
const ACCESS_SESSION_VERSION = 1
const encoder = new TextEncoder()

export const ACCESS_SESSION_COOKIE_NAME = 'domain-manage-access-session'

type AccessSessionPayload = {
  v: number
  iat: number
  exp: number
}

export async function verifyAccessKey(input: string) {
  const expected = process.env.ACCESS_KEY?.trim()

  if (!expected) {
    throw new Error('访问控制未配置')
  }

  const [inputDigest, expectedDigest] = await Promise.all([
    digest(input),
    digest(expected),
  ])

  return constantTimeEqual(inputDigest, expectedDigest)
}

export function getAccessSessionMaxAgeSeconds() {
  const rawValue = process.env.ACCESS_SESSION_MAX_AGE_SECONDS
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_ACCESS_SESSION_MAX_AGE_SECONDS
}

export async function createAccessSessionValue() {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload: AccessSessionPayload = {
    v: ACCESS_SESSION_VERSION,
    iat: issuedAt,
    exp: issuedAt + getAccessSessionMaxAgeSeconds(),
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = await signValue(encodedPayload)

  if (!signature) {
    throw new Error('访问控制未配置')
  }

  return `${encodedPayload}.${signature}`
}

export async function readAccessSessionFromCookieValue(cookieValue?: string | null) {
  if (!cookieValue) {
    return null
  }

  const [encodedPayload, providedSignature, ...rest] = cookieValue.split('.')

  if (!encodedPayload || !providedSignature || rest.length > 0) {
    return null
  }

  const expectedSignature = await signValue(encodedPayload)

  if (!expectedSignature) {
    return null
  }

  const [providedDigest, expectedDigest] = await Promise.all([
    digest(providedSignature),
    digest(expectedSignature),
  ])

  if (!constantTimeEqual(providedDigest, expectedDigest)) {
    return null
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload))

    if (!isAccessSessionPayload(payload)) {
      return null
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export async function hasAccessSessionCookie(cookieValue?: string | null) {
  return (await readAccessSessionFromCookieValue(cookieValue)) !== null
}

async function signValue(value: string) {
  const signingKey = process.env.ACCESS_SESSION_SIGNING_KEY?.trim()

  if (!signingKey) {
    return null
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value))

  return encodeBytesBase64Url(new Uint8Array(signature))
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) {
    return false
  }

  let diff = 0

  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }

  return diff === 0
}

function isAccessSessionPayload(value: unknown): value is AccessSessionPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Partial<AccessSessionPayload>

  return payload.v === ACCESS_SESSION_VERSION
    && typeof payload.iat === 'number'
    && Number.isFinite(payload.iat)
    && typeof payload.exp === 'number'
    && Number.isFinite(payload.exp)
    && payload.exp > payload.iat
}

function encodeBase64Url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))

  return atob(normalized + padding)
}

function encodeBytesBase64Url(bytes: Uint8Array) {
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return encodeBase64Url(binary)
}
