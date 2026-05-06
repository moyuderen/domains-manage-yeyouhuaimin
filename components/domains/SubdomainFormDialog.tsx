'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { createSubdomainAction, updateSubdomainAction } from '@/app/actions/subdomains'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { defaultSubdomainValues, subdomainSchema } from '@/schemas/domainSchemas'
import type { Subdomain, SubdomainFormValues } from '@/types/domain'

type SubdomainFormDialogProps = {
  open: boolean
  domainId: string
  initialValue?: Subdomain | null
  onClose: () => void
}

export function SubdomainFormDialog({ open, domainId, initialValue, onClose }: SubdomainFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const form = useForm<SubdomainFormValues>({
    resolver: zodResolver(subdomainSchema),
    defaultValues: defaultSubdomainValues,
  })

  useEffect(() => {
    if (!open) return

    if (initialValue) {
      form.reset({
        subdomain: initialValue.subdomain,
        ip: initialValue.ip,
        ipRemark: initialValue.ipRemark ?? '',
        description: initialValue.description,
        remark: initialValue.remark,
      })
      return
    }

    form.reset(defaultSubdomainValues)
  }, [form, initialValue, open])

  const { register, handleSubmit, formState: { errors } } = form

  const submit = async (values: SubdomainFormValues) => {
    setLoading(true)
    try {
      if (initialValue) {
        await updateSubdomainAction(domainId, initialValue.id, values)
        toast.success('子域名更新成功')
      } else {
        await createSubdomainAction(domainId, values)
        toast.success('子域名添加成功')
      }
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen: boolean) => {
      if (!nextOpen) onClose()
    }}>
      <DialogContent disableOutsideClose>
        <DialogHeader>
          <DialogTitle>{initialValue ? '编辑子域名' : '新增子域名'}</DialogTitle>
          <DialogDescription>维护当前域名下的子域名、对应 IP、用途说明和备注。</DialogDescription>
        </DialogHeader>
        <form className="mt-2 flex flex-col gap-6" onSubmit={handleSubmit(submit)}>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.subdomain) || undefined}>
              <FieldLabel htmlFor="subdomain-name">子域名前缀</FieldLabel>
              <Input id="subdomain-name" {...register('subdomain')} placeholder="www / api / admin" aria-invalid={Boolean(errors.subdomain)} />
              <FieldError>{errors.subdomain?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.ip) || undefined}>
              <FieldLabel htmlFor="subdomain-ip">对应 IP（选填）</FieldLabel>
              <Input id="subdomain-ip" {...register('ip')} placeholder="203.0.113.10" aria-invalid={Boolean(errors.ip)} />
              <FieldError>{errors.ip?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.ipRemark) || undefined}>
              <FieldLabel htmlFor="subdomain-ip-remark">IP 备注</FieldLabel>
              <Textarea id="subdomain-ip-remark" {...register('ipRemark')} placeholder="机房 / 供应商 / 补充说明" aria-invalid={Boolean(errors.ipRemark)} />
              <FieldError>{errors.ipRemark?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.description) || undefined}>
              <FieldLabel htmlFor="subdomain-description">用途说明</FieldLabel>
              <Input id="subdomain-description" {...register('description')} placeholder="官网入口 / 管理后台 / API 服务" aria-invalid={Boolean(errors.description)} />
              <FieldError>{errors.description?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.remark) || undefined}>
              <FieldLabel htmlFor="subdomain-remark">备注</FieldLabel>
              <Textarea id="subdomain-remark" {...register('remark')} placeholder="负责人 / 环境信息 / 补充说明" aria-invalid={Boolean(errors.remark)} />
              <FieldError>{errors.remark?.message}</FieldError>
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
