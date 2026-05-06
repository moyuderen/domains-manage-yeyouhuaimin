import { addYears, format, parseISO } from 'date-fns'
import { z } from 'zod'

import { DOMAIN_CURRENCIES, type DomainFormValues } from '@/types/domain'

const today = () => new Date().toISOString().slice(0, 10)
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

function isValidIsoDate(value: string) {
  if (!isoDatePattern.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function addOneYearToDateValue(value: string) {
  if (!isValidIsoDate(value)) return value

  return format(addYears(parseISO(value), 1), 'yyyy-MM-dd')
}

const dateField = () =>
  z
    .string()
    .refine((value) => value.length === 0 || isoDatePattern.test(value), '请输入 YYYY-MM-DD 格式的日期')
    .refine((value) => value.length === 0 || isValidIsoDate(value), '请输入合法日期')

export const domainSchema = z
  .object({
    name: z.string().trim().min(1, '请输入域名').regex(/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, '请输入合法域名'),
    registrarAccountId: z.string().trim(),
    registrarSiteId: z.string().min(1, '请选择注册站点'),
    registrationDate: dateField(),
    expiryDate: dateField(),
    dnsAccountId: z.string().trim(),
    dnsSiteId: z.string().trim(),
    renewalDaysBeforeExpiry: z.string().trim(),
    isFree: z.string(),
    currency: z.enum(DOMAIN_CURRENCIES),
    purchasePrice: z.string(),
    renewalPrice: z.string(),
    autoRenewal: z.string(),
    remark: z.string().trim(),
  })
  .refine((values) => values.registrarAccountId.length > 0, {
    message: '请选择注册站点账号',
    path: ['registrarAccountId'],
  })
  .refine(
    (values) => (values.registrationDate.length === 0) === (values.expiryDate.length === 0),
    {
      message: '注册时间和到期时间需同时填写或同时留空',
      path: ['registrationDate'],
    },
  )
  .refine(
    (values) => (values.registrationDate.length === 0) === (values.expiryDate.length === 0),
    {
      message: '注册时间和到期时间需同时填写或同时留空',
      path: ['expiryDate'],
    },
  )
  .refine(
    (values) =>
      values.registrationDate.length === 0
      || values.expiryDate.length === 0
      || values.expiryDate >= values.registrationDate,
    {
      message: '到期时间不能早于注册时间',
      path: ['expiryDate'],
    },
  )
  .refine(
    (values) => values.isFree === 'true' || values.purchasePrice.length > 0,
    {
      message: '请输入购买金额',
      path: ['purchasePrice'],
    },
  )
  .refine(
    (values) => values.isFree === 'true' || values.renewalPrice.length > 0,
    {
      message: '请输入续费金额',
      path: ['renewalPrice'],
    },
  )
  .refine(
    (values) => values.isFree === 'true' || Number(values.purchasePrice) > 0,
    {
      message: '购买金额必须大于 0',
      path: ['purchasePrice'],
    },
  )
  .refine(
    (values) => values.isFree === 'true' || Number(values.renewalPrice) > 0,
    {
      message: '续费金额必须大于 0',
      path: ['renewalPrice'],
    },
  )

export const subdomainSchema = z.object({
  subdomain: z.string().trim().min(1, '请输入子域名前缀').regex(/^[a-zA-Z0-9-]+$/, '子域名只支持字母、数字和中划线'),
  ip: z.string().trim(),
  ipRemark: z.string().trim(),
  description: z.string().trim().min(1, '请输入用途说明'),
  remark: z.string().trim(),
})

export const defaultDomainValues: DomainFormValues = {
  name: '',
  registrarAccountId: '',
  registrarSiteId: '',
  registrationDate: today(),
  expiryDate: addOneYearToDateValue(today()),
  dnsAccountId: '',
  dnsSiteId: '',
  renewalDaysBeforeExpiry: '',
  isFree: 'true',
  currency: 'USD',
  purchasePrice: '',
  renewalPrice: '',
  autoRenewal: 'false',
  remark: '',
}

export const defaultSubdomainValues = {
  subdomain: '',
  ip: '',
  ipRemark: '',
  description: '',
  remark: '',
}
