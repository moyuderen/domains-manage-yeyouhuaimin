import { z } from 'zod'

export const siteSchema = z.object({
  name: z.string().trim().min(1, '请输入站点名称').max(100),
  category: z.string().trim().max(50),
  iconUrl: z.string().trim().url('请输入有效的图标地址').or(z.literal('')),
  description: z.string().trim().max(500),
  remark: z.string().trim().max(500),
  websiteUrl: z.string().trim().url('请输入有效的网址').or(z.literal('')),
  isActive: z.boolean(),
})

export const defaultSiteValues = {
  name: '',
  category: '',
  iconUrl: '',
  description: '',
  remark: '',
  websiteUrl: '',
  isActive: true,
}
