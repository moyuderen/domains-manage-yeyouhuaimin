'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format, isValid, parse } from 'date-fns'
import { CalendarIcon, PlusIcon } from 'lucide-react'
import { DOMAIN_CURRENCIES, type DomainCurrency } from '@/types/domain'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { createDomainAction, updateDomainAction } from '@/app/actions/domains'
import { AccountFormDialog } from '@/components/accounts/AccountFormDialog'
import { SiteFormDialog } from '@/components/sites/SiteFormDialog'
import { SearchableSelect } from '@/components/searchable-select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { currencyLabel, currencySymbol } from '@/lib/currency'
import { dedupeById } from '@/lib/utils'
import { addOneYearToDateValue, defaultDomainValues, domainSchema } from '@/schemas/domainSchemas'
import { isEmail } from '@/schemas/accountSchemas'
import { toast } from 'sonner'
import type { Account } from '@/types/account'
import type { Domain, DomainDialogMode, DomainFormValues } from '@/types/domain'
import type { Site } from '@/types/site'

type DomainFormDialogProps = {
  open: boolean
  mode: DomainDialogMode
  initialValue?: Domain | null
  sites: Site[]
  accounts: Account[]
  onClose: (shouldRefresh?: boolean) => void
}

const UNSET_SELECT_VALUE = '__unset__'

export function DomainFormDialog({ open, mode, initialValue, sites, accounts, onClose }: DomainFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [quickCreateType, setQuickCreateType] = useState<'registrar' | 'dns' | null>(null)
  const [createdAccounts, setCreatedAccounts] = useState<Account[]>([])
  const [siteDialogOpen, setSiteDialogOpen] = useState(false)
  const [siteQuickCreateType, setSiteQuickCreateType] = useState<'registrar' | 'dns' | null>(null)
  const [createdSites, setCreatedSites] = useState<Site[]>([])
  const expiryDateTouchedRef = useRef(false)
  const pendingSiteRef = useRef<{ id: string; type: 'registrar' | 'dns' } | null>(null)
  const pendingAccountRef = useRef<{ id: string; type: 'registrar' | 'dns' } | null>(null)
  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: defaultDomainValues,
  })

  const allSites = useMemo(
    () => dedupeById([...sites, ...createdSites]).sort((a, b) => a.name.localeCompare(b.name)),
    [sites, createdSites],
  )

  useEffect(() => {
    if (!open) return

    setCreatedAccounts([])
    setCreatedSites([])
    setQuickCreateType(null)
    setSiteQuickCreateType(null)
    pendingSiteRef.current = null
    pendingAccountRef.current = null
    expiryDateTouchedRef.current = false

    if (mode !== 'create' && initialValue) {
      const nextValues = {
        name: initialValue.name,
        registrarAccountId: initialValue.registrarAccountId ?? '',
        registrarSiteId: initialValue.registrarSiteId ?? '',
        registrationDate: initialValue.registrationDate ?? '',
        expiryDate: initialValue.expiryDate ?? '',
        dnsAccountId: initialValue.dnsAccountId ?? '',
        dnsSiteId: initialValue.dnsSiteId ?? '',
        renewalDaysBeforeExpiry: initialValue.renewalDaysBeforeExpiry != null ? String(initialValue.renewalDaysBeforeExpiry) : '',
        isFree: String(initialValue.isFree),
        currency: initialValue.currency,
        purchasePrice: initialValue.purchasePrice != null ? String(initialValue.purchasePrice) : '',
        renewalPrice: initialValue.renewalPrice != null ? String(initialValue.renewalPrice) : '',
        autoRenewal: String(initialValue.autoRenewal),
        remark: initialValue.remark,
      } satisfies DomainFormValues

      form.reset(nextValues)
      return
    }

    form.reset(defaultDomainValues)
  }, [form, initialValue, mode, open])

  const { register, handleSubmit, setValue, getValues, watch, control, trigger, formState: { errors } } = form

  const allAccounts = useMemo(
    () => dedupeById([...accounts, ...createdAccounts]).sort((a, b) => a.identifier.localeCompare(b.identifier)),
    [accounts, createdAccounts],
  )
  const accountsById = useMemo(
    () => new Map(allAccounts.map((account) => [account.id, account])),
    [allAccounts],
  )
  const registrationDate = watch('registrationDate')
  const expiryDate = watch('expiryDate')
  const registrarSiteId = watch('registrarSiteId')
  const dnsSiteId = watch('dnsSiteId')
  const registrarAccountId = watch('registrarAccountId')
  const dnsAccountId = watch('dnsAccountId')
  const isFree = watch('isFree')
  const currency = watch('currency')
  const autoRenewal = watch('autoRenewal')
  const activeAccounts = useMemo(() => allAccounts.filter((account) => account.isActive), [allAccounts])
  const registrarAccounts = useMemo(
    () => getSelectableAccounts(activeAccounts, accountsById, registrarAccountId, registrarSiteId),
    [activeAccounts, accountsById, registrarAccountId, registrarSiteId],
  )
  const dnsAccounts = useMemo(
    () => getSelectableAccounts(activeAccounts, accountsById, dnsAccountId, dnsSiteId),
    [activeAccounts, accountsById, dnsAccountId, dnsSiteId],
  )

  const handleRegistrarSiteChange = (siteId: string) => {
    setValue('registrarSiteId', siteId, { shouldValidate: true, shouldDirty: true })
  }

  const handleDnsSiteChange = (siteId: string) => {
    setValue('dnsSiteId', siteId, { shouldValidate: true, shouldDirty: true })
  }

  const handleRegistrationDateChange = (value: string) => {
    const currentExpiryDate = getValues('expiryDate')
    const shouldAutoFillExpiry = value.length > 0 && (!expiryDateTouchedRef.current || currentExpiryDate.length === 0)
    const nextExpiryDate = shouldAutoFillExpiry ? addOneYearToDateValue(value) : currentExpiryDate

    setValue('registrationDate', value, { shouldValidate: false, shouldDirty: true })

    if (shouldAutoFillExpiry && nextExpiryDate !== value) {
      setValue('expiryDate', nextExpiryDate, { shouldValidate: false, shouldDirty: true })
    }

    void trigger(['registrationDate', 'expiryDate'])
  }

  const handleExpiryDateChange = (value: string) => {
    expiryDateTouchedRef.current = value.length > 0
    setValue('expiryDate', value, { shouldValidate: false, shouldDirty: true })
    void trigger(['registrationDate', 'expiryDate'])
  }

  const handleAccountChange = (accountIdField: 'registrarAccountId' | 'dnsAccountId') => {
    return (accountId: string) => {
      setValue(accountIdField, accountId, { shouldValidate: true, shouldDirty: true })
    }
  }

  const handleRegistrarAccountChange = handleAccountChange('registrarAccountId')
  const handleDnsAccountChange = handleAccountChange('dnsAccountId')

  useEffect(() => {
    const pending = pendingSiteRef.current
    if (!pending) return
    pendingSiteRef.current = null
    if (pending.type === 'registrar') {
      handleRegistrarSiteChange(pending.id)
    } else {
      handleDnsSiteChange(pending.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSites])

  useEffect(() => {
    const pending = pendingAccountRef.current
    if (!pending) return
    pendingAccountRef.current = null
    if (pending.type === 'registrar') {
      handleRegistrarAccountChange(pending.id)
    } else {
      handleDnsAccountChange(pending.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAccounts])

  const openQuickCreate = (type: 'registrar' | 'dns') => {
    setQuickCreateType(type)
    setAccountDialogOpen(true)
  }

  const submit = async (values: DomainFormValues) => {
    setLoading(true)
    try {
      if (mode === 'edit' && initialValue) {
        await updateDomainAction(initialValue.id, values)
        toast.success('域名更新成功')
      } else {
        await createDomainAction(values)
        toast.success(mode === 'clone' ? '域名复制成功' : '域名添加成功')
      }
      onClose(true)
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
      <DialogContent disableOutsideClose className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? '编辑域名' : mode === 'clone' ? '复制域名' : '添加域名'}</DialogTitle>
          <DialogDescription>
            {mode === 'clone' ? '已回显原域名信息，保存后会新增一条记录；请先确认并修改域名。' : '填写域名基础信息与 DNS 归属信息。'}
          </DialogDescription>
        </DialogHeader>
        <form className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit(submit)}>
          <input type="hidden" {...register('registrationDate')} />
          <input type="hidden" {...register('expiryDate')} />

          <FieldGroup className="form-scrollbar min-h-0 flex-1 gap-4 overflow-y-auto px-1">
            <Field data-invalid={Boolean(errors.name) || undefined}>
              <FieldLabel htmlFor="domain-name">域名</FieldLabel>
              <Input id="domain-name" {...register('name')} placeholder="example.com" aria-invalid={Boolean(errors.name)} />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.registrarSiteId) || undefined}>
              <FieldLabel htmlFor="domain-registrar-site">注册站点</FieldLabel>
              <div className="flex">
                <div className="flex-1">
                  <Controller
                    control={control}
                    name="registrarSiteId"
                    render={({ field }) => (
                      <SearchableSelect
                        key={`registrar-${initialValue?.id ?? 'create'}`}
                        id="domain-registrar-site"
                        value={field.value || ''}
                        onValueChange={(siteId) => handleRegistrarSiteChange(siteId)}
                        placeholder="请选择注册站点"
                        searchPlaceholder="搜索注册站点..."
                        className="w-full rounded-r-none"
                        aria-invalid={Boolean(errors.registrarSiteId)}
                        options={allSites.map((site) => ({ label: site.name, value: site.id }))}
                      />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-l-none border-l-0"
                  aria-label="快速新建注册站点"
                  title="快速新建注册站点"
                  onClick={() => {
                    setSiteQuickCreateType('registrar')
                    setSiteDialogOpen(true)
                  }}
                >
                  <PlusIcon />
                </Button>
              </div>
              <FieldError>{errors.registrarSiteId?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.registrarAccountId) || undefined}>
              <FieldLabel htmlFor="domain-registrar-account">注册站点账号</FieldLabel>
              <div className="flex">
                <div className="flex-1">
                  <Controller
                    control={control}
                    name="registrarAccountId"
                    render={({ field }) => (
                      <SearchableSelect
                        key={`registrar-account-${initialValue?.id ?? 'create'}`}
                        id="domain-registrar-account"
                        value={field.value || ''}
                        onValueChange={handleRegistrarAccountChange}
                        placeholder="请选择注册站点账号"
                        searchPlaceholder="搜索注册站点账号..."
                        className="w-full rounded-r-none"
                        aria-invalid={Boolean(errors.registrarAccountId)}
                        options={registrarAccounts.map((account) => ({ label: account.identifier, value: account.id }))}
                      />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-l-none border-l-0"
                  aria-label="快速新建注册站点账号"
                  title="快速新建注册站点账号"
                  onClick={() => openQuickCreate('registrar')}
                >
                  <PlusIcon />
                </Button>
              </div>
              <FieldError>{errors.registrarAccountId?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.registrationDate) || undefined}>
              <FieldLabel htmlFor="domain-registration-date">注册时间</FieldLabel>
              <DatePicker
                id="domain-registration-date"
                value={registrationDate}
                placeholder="YYYY-MM-DD"
                ariaInvalid={Boolean(errors.registrationDate)}
                onChange={handleRegistrationDateChange}
              />
              <FieldError>{errors.registrationDate?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.expiryDate) || undefined}>
              <FieldLabel htmlFor="domain-expiry-date">到期时间</FieldLabel>
              <DatePicker
                id="domain-expiry-date"
                value={expiryDate}
                placeholder="YYYY-MM-DD"
                ariaInvalid={Boolean(errors.expiryDate)}
                onChange={handleExpiryDateChange}
              />
              <FieldError>{errors.expiryDate?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.renewalDaysBeforeExpiry) || undefined}>
              <FieldLabel htmlFor="domain-renewal-days">到期前可续期天数</FieldLabel>
              <Input
                id="domain-renewal-days"
                type="number"
                {...register('renewalDaysBeforeExpiry')}
                placeholder="如 30，表示到期前 30 天可续期"
                aria-invalid={Boolean(errors.renewalDaysBeforeExpiry)}
              />
              <FieldError>{errors.renewalDaysBeforeExpiry?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>域名类型</FieldLabel>
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={isFree === 'false'}
                  onCheckedChange={(checked) => {
                    setValue('isFree', checked ? 'false' : 'true', { shouldValidate: true, shouldDirty: true })
                  }}
                  aria-label="付费域名"
                />
                <span className="text-sm text-muted-foreground">{isFree === 'false' ? '付费域名' : '免费域名'}</span>
              </div>
            </Field>

            {isFree === 'false' && (
              <>
                <Field data-invalid={Boolean(errors.purchasePrice) || undefined}>
                  <FieldLabel htmlFor="domain-purchase-price">购买金额</FieldLabel>
                  <div className="flex">
                    <Input
                      id="domain-purchase-price"
                      type="number"
                      step="0.01"
                      min="0"
                      className="rounded-r-none"
                      {...register('purchasePrice')}
                      placeholder="请输入购买金额"
                      aria-invalid={Boolean(errors.purchasePrice)}
                    />
                    <Controller
                      control={control}
                      name="currency"
                      render={({ field }) => (
                        <Select
                          value={field.value || 'USD'}
                          onValueChange={(value) => field.onChange(value)}
                        >
                          <SelectTrigger className="w-auto min-w-[3.5rem] shrink-0 rounded-l-none border-l-0" aria-invalid={Boolean(errors.currency)}>
                            <SelectValue asChild>
                              <span>{currencySymbol((field.value || 'USD') as DomainCurrency)}</span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {DOMAIN_CURRENCIES.map((c) => (
                                <SelectItem key={c} value={c}>{currencyLabel(c)}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <FieldError>{errors.purchasePrice?.message}</FieldError>
                </Field>

                <Field data-invalid={Boolean(errors.renewalPrice) || undefined}>
                  <FieldLabel htmlFor="domain-renewal-price">续费金额</FieldLabel>
                  <div className="flex">
                    <Input
                      id="domain-renewal-price"
                      type="number"
                      step="0.01"
                      min="0"
                      className="rounded-r-none"
                      {...register('renewalPrice')}
                      placeholder="请输入续费金额"
                      aria-invalid={Boolean(errors.renewalPrice)}
                    />
                    <div className="flex shrink-0 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground min-w-[3.5rem] justify-center">
                      {currencySymbol((currency || 'USD') as DomainCurrency)}
                    </div>
                  </div>
                  <FieldError>{errors.renewalPrice?.message}</FieldError>
                </Field>

                <Field>
                  <FieldLabel>自动续费</FieldLabel>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      checked={autoRenewal === 'true'}
                      onCheckedChange={(checked) => {
                        setValue('autoRenewal', checked ? 'true' : 'false', { shouldDirty: true })
                      }}
                      aria-label="自动续费"
                    />
                    <span className="text-sm text-muted-foreground">{autoRenewal === 'true' ? '已开启' : '未开启'}</span>
                  </div>
                </Field>
              </>
            )}

            <Field data-invalid={Boolean(errors.dnsSiteId) || undefined}>
              <FieldLabel htmlFor="domain-dns-site">DNS 站点</FieldLabel>
              <div className="flex">
                <div className="flex-1">
                  <Controller
                    control={control}
                    name="dnsSiteId"
                    render={({ field }) => (
                      <SearchableSelect
                        key={`dns-${initialValue?.id ?? 'create'}`}
                        id="domain-dns-site"
                        value={field.value || ''}
                        onValueChange={(siteId) => handleDnsSiteChange(siteId === UNSET_SELECT_VALUE ? '' : siteId)}
                        placeholder="请选择 DNS 站点"
                        searchPlaceholder="搜索 DNS 站点..."
                        className="w-full rounded-r-none"
                        aria-invalid={Boolean(errors.dnsSiteId)}
                        options={[
                          { label: '未设置', value: UNSET_SELECT_VALUE },
                          ...allSites.map((site) => ({ label: site.name, value: site.id })),
                        ]}
                      />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-l-none border-l-0"
                  aria-label="快速新建 DNS 站点"
                  title="快速新建 DNS 站点"
                  onClick={() => {
                    setSiteQuickCreateType('dns')
                    setSiteDialogOpen(true)
                  }}
                >
                  <PlusIcon />
                </Button>
              </div>
              <FieldError>{errors.dnsSiteId?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.dnsAccountId) || undefined}>
              <FieldLabel htmlFor="domain-dns-account">DNS 账号</FieldLabel>
              <div className="flex">
                <div className="flex-1">
                  <Controller
                    control={control}
                    name="dnsAccountId"
                    render={({ field }) => (
                      <SearchableSelect
                        key={`dns-account-${initialValue?.id ?? 'create'}`}
                        id="domain-dns-account"
                        value={field.value || ''}
                        onValueChange={(accountId) => handleDnsAccountChange(accountId === UNSET_SELECT_VALUE ? '' : accountId)}
                        placeholder="请选择 DNS 账号"
                        searchPlaceholder="搜索 DNS 账号..."
                        className="w-full rounded-r-none"
                        aria-invalid={Boolean(errors.dnsAccountId)}
                        options={[
                          { label: '未设置', value: UNSET_SELECT_VALUE },
                          ...dnsAccounts.map((account) => ({ label: account.identifier, value: account.id })),
                        ]}
                      />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-l-none border-l-0"
                  aria-label="快速新建 DNS 账号"
                  title="快速新建 DNS 账号"
                  onClick={() => openQuickCreate('dns')}
                >
                  <PlusIcon />
                </Button>
              </div>
              <FieldError>{errors.dnsAccountId?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.remark) || undefined}>
              <FieldLabel htmlFor="domain-remark">备注</FieldLabel>
              <Textarea
                id="domain-remark"
                {...register('remark')}
                placeholder="备注信息"
                aria-invalid={Boolean(errors.remark)}
              />
              <FieldError>{errors.remark?.message}</FieldError>
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onClose()}>取消</Button>
            <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
          </div>
        </form>
      </DialogContent>
      <AccountFormDialog
        open={accountDialogOpen}
        sites={allSites}
        emailIdentifiers={allAccounts.filter((a) => isEmail(a.identifier)).map((a) => a.identifier)}
        onClose={(createdAccount) => {
          setAccountDialogOpen(false)

          if (!createdAccount) {
            setQuickCreateType(null)
            return
          }

          setCreatedAccounts((prev) => (prev.some((account) => account.id === createdAccount.id) ? prev : [...prev, createdAccount]))

          pendingAccountRef.current = { id: createdAccount.id, type: quickCreateType! }

          setQuickCreateType(null)
        }}
      />
      <SiteFormDialog
        open={siteDialogOpen}
        onClose={(createdSite) => {
          setSiteDialogOpen(false)

          if (!createdSite) {
            setSiteQuickCreateType(null)
            return
          }

          setCreatedSites((prev) => (prev.some((site) => site.id === createdSite.id) ? prev : [...prev, createdSite]))

          pendingSiteRef.current = { id: createdSite.id, type: siteQuickCreateType! }

          setSiteQuickCreateType(null)
        }}
      />
    </Dialog>
  )
}

function DatePicker({
  id,
  value,
  placeholder,
  ariaInvalid,
  onChange,
}: {
  id: string
  value: string
  placeholder: string
  ariaInvalid?: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftValue, setDraftValue] = useState<string | null>(null)

  const displayValue = draftValue ?? value
  const selectedDate = parseDateValue(value)

  const commitInputValue = () => {
    const normalizedValue = displayValue.trim()
    onChange(normalizedValue)
    setDraftValue(null)
  }

  const handleSelect = (date?: Date) => {
    if (!date) return

    const nextValue = formatDateValue(date)
    setDraftValue(null)
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Input
          id={id}
          value={displayValue}
          placeholder={placeholder}
          aria-invalid={ariaInvalid}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitInputValue}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            commitInputValue()
          }}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="打开日期选择器"
          >
            <CalendarIcon size={16} />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent align="end">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate ?? new Date()}
          startMonth={new Date(2000, 0)}
          endMonth={new Date(2060, 11)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function parseDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined

  const date = parse(value, 'yyyy-MM-dd', new Date())
  if (!isValid(date) || format(date, 'yyyy-MM-dd') !== value) return undefined

  return date
}

function formatDateValue(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function getSelectableAccounts(
  activeAccounts: Account[],
  accountsById: Map<string, Account>,
  selectedAccountId: string,
  selectedSiteId: string,
) {
  const sortedAccounts = selectedSiteId
    ? [...activeAccounts].sort((left, right) => {
      const leftMatches = left.sites.some((site) => site.site === selectedSiteId)
      const rightMatches = right.sites.some((site) => site.site === selectedSiteId)
      if (leftMatches === rightMatches) return left.identifier.localeCompare(right.identifier)
      return leftMatches ? -1 : 1
    })
    : activeAccounts

  if (!selectedAccountId) {
    return sortedAccounts
  }

  const selectedAccount = accountsById.get(selectedAccountId)

  if (!selectedAccount || sortedAccounts.some((account) => account.id === selectedAccountId)) {
    return sortedAccounts
  }

  return [selectedAccount, ...sortedAccounts]
}
