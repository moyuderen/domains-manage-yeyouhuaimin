import { z } from 'zod'

import { EMAIL_PROVIDERS } from '@/types/account'

const siteEntrySchema = z.object({
  site: z.string().trim().min(1, '站点 ID 不能为空'),
  note: z.string(),
  isActive: z.boolean(),
})

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim())
}

export const accountSchema = z
  .object({
    identifier: z.string().trim().min(1, '请输入账号标识').max(200),
    email: z.string().trim().max(200),
    emailProvider: z.enum(EMAIL_PROVIDERS),
    emailProviderDetail: z.string().trim().max(100),
    sites: z.array(siteEntrySchema),
    passwordHint: z.string().trim().max(200),
    vaultLocation: z.string().trim().max(200),
    description: z.string().trim().max(500),
    isActive: z.boolean(),
  })
  .refine((values) => values.emailProvider !== 'other' || values.emailProviderDetail.length > 0, {
    message: '请选择"其他"时请补充邮箱类型说明',
    path: ['emailProviderDetail'],
  })

export const defaultAccountValues = {
  identifier: '',
  email: '',
  emailProvider: 'google' as const,
  emailProviderDetail: '',
  sites: [] as { site: string; note: string; isActive: boolean }[],
  passwordHint: '',
  vaultLocation: 'Bitwarden',
  description: '',
  isActive: true,
}
