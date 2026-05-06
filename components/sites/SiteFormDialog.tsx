'use client'

/* eslint-disable @next/next/no-img-element */

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { createSiteAction, updateSiteAction } from '@/app/actions/sites'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { defaultSiteValues, siteSchema } from '@/schemas/siteSchemas'
import type { Site, SiteFormValues } from '@/types/site'

const PRESET_CATEGORIES = ['注册商', 'DNS', 'CDN', '云服务', '邮箱', '监控', '建站', '其他']

type SiteFormDialogProps = {
  open: boolean
  initialValue?: Site | null
  onClose: (createdSite?: Site) => void
}

export function SiteFormDialog({ open, initialValue, onClose }: SiteFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: defaultSiteValues,
  })

  useEffect(() => {
    if (!open) return

    if (initialValue) {
      form.reset({
        name: initialValue.name,
        category: initialValue.category,
        iconUrl: initialValue.iconUrl,
        description: initialValue.description,
        remark: initialValue.remark,
        websiteUrl: initialValue.websiteUrl,
        isActive: initialValue.isActive,
      })
      return
    }

    form.reset(defaultSiteValues)
  }, [form, initialValue, open])

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form

  const iconUrl = watch('iconUrl')

  const submit = async (values: SiteFormValues) => {
    setLoading(true)
    try {
      if (initialValue) {
        await updateSiteAction(initialValue.id, values)
        toast.success('站点更新成功')
        onClose()
        return
      }

      const site = await createSiteAction(values)
      toast.success('站点添加成功')
      onClose(site)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent disableOutsideClose>
        <DialogHeader>
          <DialogTitle>{initialValue ? '编辑站点' : '添加站点'}</DialogTitle>
          <DialogDescription>配置站点基本信息。</DialogDescription>
        </DialogHeader>
        <form className="mt-2 flex flex-col gap-6" onSubmit={handleSubmit(submit)}>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.name) || undefined}>
              <FieldLabel htmlFor="site-name">站点名称</FieldLabel>
              <Input id="site-name" {...register('name')} placeholder="阿里云 / Cloudflare" aria-invalid={Boolean(errors.name)} />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.category) || undefined}>
              <FieldLabel htmlFor="site-category">分类</FieldLabel>
              <Input id="site-category" {...register('category')} placeholder="如：注册商、DNS、CDN、云服务" aria-invalid={Boolean(errors.category)} />
              <div className="flex flex-wrap gap-1.5">
                {PRESET_CATEGORIES.map((c) => (
                  <Badge
                    key={c}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setValue('category', c, { shouldValidate: true })}
                  >
                    {c}
                  </Badge>
                ))}
              </div>
              <FieldError>{errors.category?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.websiteUrl) || undefined}>
              <FieldLabel htmlFor="site-website-url">网站地址</FieldLabel>
              <Input id="site-website-url" {...register('websiteUrl')} placeholder="https://example.com" aria-invalid={Boolean(errors.websiteUrl)} />
              <FieldError>{errors.websiteUrl?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.iconUrl) || undefined}>
              <FieldLabel htmlFor="site-icon-url">图标地址</FieldLabel>
              <div className="flex items-center gap-3">
                <Input id="site-icon-url" {...register('iconUrl')} placeholder="https://example.com/icon.png" aria-invalid={Boolean(errors.iconUrl)} />
                {iconUrl && (
                  <img src={iconUrl} alt="" width={32} height={32} className="h-8 w-8 rounded object-contain" loading="lazy" />
                )}
              </div>
              <FieldError>{errors.iconUrl?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.description) || undefined}>
              <FieldLabel htmlFor="site-description">描述</FieldLabel>
              <Input id="site-description" {...register('description')} placeholder="站点用途说明（可选）" aria-invalid={Boolean(errors.description)} />
              <FieldError>{errors.description?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.remark) || undefined}>
              <FieldLabel htmlFor="site-remark">备注</FieldLabel>
              <Textarea id="site-remark" {...register('remark')} placeholder="站点备注信息（可选）" aria-invalid={Boolean(errors.remark)} />
              <FieldError>{errors.remark?.message}</FieldError>
            </Field>

          </FieldGroup>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onClose()}>取消</Button>
            <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
