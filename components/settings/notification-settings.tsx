'use client'

import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Loader2, Send } from 'lucide-react'

import { cn } from '@/lib/utils'

import {
  saveEmailProviderAction,
  sendEmailTestAction,
} from '@/app/actions/email'
import {
  getChatIdAction,
  saveNotificationRulesAction,
  saveTelegramProviderAction,
  sendTestMessageAction,
} from '@/app/actions/telegram'
import {
  saveWebhookProviderAction,
  sendWebhookTestAction,
} from '@/app/actions/webhook'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLegend, FieldSet, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  COMMON_NOTIFICATION_TIMEZONES,
  createDefaultNotificationPreferenceToggles,
  type NotificationPreferenceToggles,
  type NotificationSettingsPageData,
  type WebhookFormat,
  type WebhookMentionMode,
} from '@/lib/notifications/settings'

const RESOURCE_CHANGE_GROUPS = [
  {
    title: '域名',
    description: '控制域名新增、编辑、删除事件的提醒是否生效。',
    enabledKey: 'domainEnabled',
    items: [
      { key: 'domainCreate', label: '新增' },
      { key: 'domainUpdate', label: '编辑' },
      { key: 'domainDelete', label: '删除' },
    ],
  },
  {
    title: '站点',
    description: '控制站点新增、编辑、删除事件的提醒是否生效。',
    enabledKey: 'siteEnabled',
    items: [
      { key: 'siteCreate', label: '新增' },
      { key: 'siteUpdate', label: '编辑' },
      { key: 'siteDelete', label: '删除' },
    ],
  },
  {
    title: '账号',
    description: '控制账号新增、编辑、删除事件的提醒是否生效。',
    enabledKey: 'accountEnabled',
    items: [
      { key: 'accountCreate', label: '新增' },
      { key: 'accountUpdate', label: '编辑' },
      { key: 'accountDelete', label: '删除' },
    ],
  },
] as const satisfies Array<{
  title: string
  description: string
  enabledKey: keyof NotificationPreferenceToggles['resourceChange']
  items: ReadonlyArray<{
    key: keyof NotificationPreferenceToggles['resourceChange']
    label: string
  }>
}>

const PREFERENCE_ITEMS = [
  {
    key: 'domainExpiryReminder',
    title: '域名到期提醒',
    description: '域名即将到期或已经到期时发送提醒。',
  },
  {
    key: 'authActivity',
    title: '登录提醒',
    description: '登录、登出、登录失败等登录相关事件发送提醒。',
  },
  {
    key: 'settingsChange',
    title: '设置变更',
    description: '项目设置变更时发送提醒。',
  },
] as const satisfies Array<{
  key: Exclude<keyof NotificationPreferenceToggles, 'resourceChange'>
  title: string
  description: string
}>

type NotificationSettingsProps = {
  initialConfig: NotificationSettingsPageData
}

const WEBHOOK_FORMAT_OPTIONS: { value: WebhookFormat; label: string; placeholder: string }[] = [
  { value: 'generic', label: '通用 JSON', placeholder: '请输入 Webhook URL（HTTPS）' },
  { value: 'discord', label: 'Discord', placeholder: '粘贴 Discord Webhook URL' },
  { value: 'feishu', label: '飞书', placeholder: '粘贴飞书群机器人 Webhook URL' },
  { value: 'dingtalk', label: '钉钉', placeholder: '粘贴钉钉群机器人 Webhook URL' },
]

const SECRET_LABELS: Record<WebhookFormat, string> = {
  generic: '签名密钥（用于 HMAC-SHA256 签名，可选）',
  discord: '签名密钥（Discord 不需要，可留空）',
  feishu: '签名密钥（飞书开启签名校验时必填）',
  dingtalk: '签名密钥（钉钉开启加签安全设置时必填）',
}

const MENTION_TARGET_PLACEHOLDERS: Record<WebhookFormat, string> = {
  discord: '输入用户或角色 ID，多个用逗号分隔',
  feishu: '输入 open_id，多个用逗号分隔',
  dingtalk: '输入手机号，多个用逗号分隔',
  generic: '自定义 @ 提醒不适用于通用格式',
}

const MENTION_TARGET_DESCRIPTIONS: Record<WebhookFormat, string> = {
  discord: 'Discord 用户/角色数字 ID，如 123456789,987654321',
  feishu: '飞书 open_id，如 ou_xxxxx,ou_yyyyy',
  dingtalk: '钉钉手机号，如 13800138000,13900139000',
  generic: '通用格式不支持自定义 @',
}

const MENTION_MODE_OPTIONS: { value: WebhookMentionMode; label: string }[] = [
  { value: 'none', label: '不提醒' },
  { value: 'all', label: '@所有人' },
  { value: 'custom', label: '自定义 @' },
]

const NOTIFICATION_CHANNEL_TABS = [
  {
    value: 'telegram',
    label: 'Telegram',
    title: 'Telegram 通道',
    description: '配置 Telegram 凭证、接收目标与通道启用状态。',
  },
  {
    value: 'email',
    label: 'Email',
    title: 'Email 通道',
    description: '配置通用 SMTP 发信参数、收件人列表与测试发送。',
  },
  {
    value: 'webhook',
    label: 'Webhook',
    title: 'Webhook 通道',
    description: '配置 Webhook URL，支持通用 JSON、Discord、飞书、钉钉格式。',
  },
] as const

const DEFAULT_NOTIFICATION_CHANNEL_TAB = NOTIFICATION_CHANNEL_TABS[0].value

function NotificationChannelTabPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

export function NotificationSettings({ initialConfig }: NotificationSettingsProps) {
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState(initialConfig.telegramProvider.chatId)
  const [enabled, setEnabled] = useState(initialConfig.telegramProvider.enabled)
  const [expiryDays, setExpiryDays] = useState(initialConfig.rules.expiryDays)
  const [notifyHour, setNotifyHour] = useState(initialConfig.rules.notifyHour)
  const [notifyTimezone, setNotifyTimezone] = useState(initialConfig.rules.notifyTimezone)
  const [preferences, setPreferences] = useState<NotificationPreferenceToggles>(initialConfig.rules.preferences ?? createDefaultNotificationPreferenceToggles())
  const [hasToken, setHasToken] = useState(initialConfig.telegramProvider.hasToken)
  const [webhookUrl, setWebhookUrl] = useState(initialConfig.webhookProvider.url)
  const [webhookSecret, setWebhookSecret] = useState('')
  const [webhookFormat, setWebhookFormat] = useState<WebhookFormat>(initialConfig.webhookProvider.format)
  const [webhookEnabled, setWebhookEnabled] = useState(initialConfig.webhookProvider.enabled)
  const [webhookHasSecret, setWebhookHasSecret] = useState(initialConfig.webhookProvider.hasSecret)
  const [webhookMentionMode, setWebhookMentionMode] = useState<WebhookMentionMode>(initialConfig.webhookProvider.mentionMode)
  const [webhookMentionTargets, setWebhookMentionTargets] = useState(initialConfig.webhookProvider.mentionTargets)
  const [emailHost, setEmailHost] = useState(initialConfig.emailProvider.smtpHost)
  const [emailPort, setEmailPort] = useState(String(initialConfig.emailProvider.smtpPort))
  const [emailSecure, setEmailSecure] = useState(initialConfig.emailProvider.smtpSecure)
  const [emailUsername, setEmailUsername] = useState(initialConfig.emailProvider.smtpUsername)
  const [emailPassword, setEmailPassword] = useState('')
  const [emailFromAddress, setEmailFromAddress] = useState(initialConfig.emailProvider.fromEmail)
  const [emailFromName, setEmailFromName] = useState(initialConfig.emailProvider.fromName)
  const [emailReplyTo, setEmailReplyTo] = useState(initialConfig.emailProvider.replyToEmail)
  const [emailRecipientsText, setEmailRecipientsText] = useState(initialConfig.emailProvider.recipientsText)
  const [emailEnabled, setEmailEnabled] = useState(initialConfig.emailProvider.enabled)
  const [emailHasPassword, setEmailHasPassword] = useState(initialConfig.emailProvider.hasPassword)
  const [savingRules, startRulesTransition] = useTransition()
  const [savingProvider, startProviderTransition] = useTransition()
  const [testing, startTestTransition] = useTransition()
  const [fetchingChatId, startFetchChatIdTransition] = useTransition()
  const [savingWebhook, startWebhookTransition] = useTransition()
  const [testingWebhook, startWebhookTestTransition] = useTransition()
  const [savingEmail, startEmailTransition] = useTransition()
  const [testingEmail, startEmailTestTransition] = useTransition()

  const handleSaveRules = () => {
    startRulesTransition(async () => {
      try {
        await saveNotificationRulesAction({
          expiryDays,
          notifyHour,
          notifyTimezone,
          preferences,
        })
        toast.success('通知规则已保存')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '保存失败')
      }
    })
  }

  const handleSaveProvider = () => {
    if (!botToken.trim() && !hasToken) {
      toast.error('请输入 Bot Token')
      return
    }

    if (!chatId.trim()) {
      toast.error('请输入 Chat ID')
      return
    }

    startProviderTransition(async () => {
      try {
        await saveTelegramProviderAction({
          botToken: botToken.trim(),
          chatId: chatId.trim(),
          enabled,
        })
        setHasToken(botToken.trim().length > 0 || hasToken)
        setBotToken('')
        toast.success('Telegram 通道已保存')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '保存失败')
      }
    })
  }

  const handleSendTest = () => {
    startTestTransition(async () => {
      try {
        await sendTestMessageAction()
        toast.success('测试消息已发送')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '发送失败')
      }
    })
  }

  const handleGetChatId = () => {
    if (!botToken.trim() && !hasToken) {
      toast.error('请先输入 Bot Token')
      return
    }

    startFetchChatIdTransition(async () => {
      try {
        const result = await getChatIdAction(botToken.trim())
        setChatId(result.chatId)
        toast.success('已获取 Chat ID')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '获取 Chat ID 失败')
      }
    })
  }

  const handleSaveEmail = () => {
    if (!emailRecipientsText.trim()) {
      toast.error('请至少填写一个收件人邮箱')
      return
    }

    startEmailTransition(async () => {
      try {
        await saveEmailProviderAction({
          smtpHost: emailHost.trim(),
          smtpPort: Number(emailPort),
          smtpSecure: emailSecure,
          smtpUsername: emailUsername.trim(),
          smtpPassword: emailPassword.trim(),
          fromEmail: emailFromAddress.trim(),
          fromName: emailFromName.trim(),
          replyToEmail: emailReplyTo.trim(),
          recipientsText: emailRecipientsText,
          enabled: emailEnabled,
        })
        setEmailHasPassword(emailPassword.trim().length > 0 || emailHasPassword)
        setEmailPassword('')
        toast.success('Email 通道已保存')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '保存失败')
      }
    })
  }

  const handleSendEmailTest = () => {
    startEmailTestTransition(async () => {
      try {
        await sendEmailTestAction()
        toast.success('测试邮件已发送')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '发送失败')
      }
    })
  }

  const updatePreference = (key: Exclude<keyof NotificationPreferenceToggles, 'resourceChange'>, value: boolean) => {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const updateResourceChangePreference = (key: keyof NotificationPreferenceToggles['resourceChange'], value: boolean) => {
    setPreferences((current) => ({
      ...current,
      resourceChange: {
        ...current.resourceChange,
        [key]: value,
      },
    }))
  }

  const canSaveProvider = (botToken.trim() || hasToken) && chatId.trim()
  const canTest = (botToken.trim() || hasToken) && chatId.trim()

  const handleSaveWebhook = () => {
    if (!webhookUrl.trim()) {
      toast.error('请输入 Webhook URL')
      return
    }

    startWebhookTransition(async () => {
      try {
        await saveWebhookProviderAction({
          url: webhookUrl.trim(),
          secret: webhookSecret.trim(),
          format: webhookFormat,
          mentionMode: webhookMentionMode,
          mentionTargets: webhookMentionTargets.trim(),
          enabled: webhookEnabled,
        })
        setWebhookHasSecret(webhookSecret.trim().length > 0 || webhookHasSecret)
        setWebhookSecret('')
        toast.success('Webhook 通道已保存')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '保存失败')
      }
    })
  }

  const handleSendWebhookTest = () => {
    startWebhookTestTransition(async () => {
      try {
        await sendWebhookTestAction()
        toast.success('Webhook 测试消息已发送')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '发送失败')
      }
    })
  }

  const canSaveWebhook = webhookUrl.trim().startsWith('https://')
  const canTestWebhook = webhookUrl.trim().startsWith('https://')
  const canSaveEmail = Boolean(
    emailHost.trim()
    && emailPort.trim()
    && emailUsername.trim()
    && emailFromAddress.trim()
    && emailFromName.trim()
    && emailRecipientsText.trim()
    && (emailPassword.trim() || emailHasPassword)
  )
  const canTestEmail = Boolean(emailHasPassword && emailRecipientsText.trim())

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>通知规则</CardTitle>
          <CardDescription>统一配置通知偏好、到期提醒与每日调度时间。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>通知偏好</FieldLegend>
              <FieldDescription>仅高价值事件会发送通知，完整记录请查看操作日志。</FieldDescription>
              {PREFERENCE_ITEMS.map((item) => {
                const titleId = `${item.key}-title`

                return (
                  <Field key={item.key} orientation="horizontal">
                    <div className="space-y-1">
                      <FieldTitle id={titleId}>{item.title}</FieldTitle>
                      <FieldDescription>{item.description}</FieldDescription>
                    </div>
                    <Switch
                      aria-labelledby={titleId}
                      checked={preferences[item.key]}
                      onCheckedChange={(value) => updatePreference(item.key, value)}
                      disabled={savingRules}
                    />
                  </Field>
                )
              })}
            </FieldSet>

            <FieldSet>
              <FieldLegend>变更提醒</FieldLegend>
              <FieldDescription>按资源类型控制提醒是否生效，并分别保留新增、编辑、删除的细分偏好。</FieldDescription>
              <div className="grid grid-cols-1 gap-4">
                {RESOURCE_CHANGE_GROUPS.map((group) => {
                  const groupEnabled = preferences.resourceChange[group.enabledKey]
                  const groupTitleId = `${group.enabledKey}-title`

                  return (
                    <Card key={group.enabledKey}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <CardTitle id={groupTitleId}>{group.title}</CardTitle>
                            <CardDescription>{group.description}</CardDescription>
                          </div>
                          <Switch
                            aria-labelledby={groupTitleId}
                            checked={groupEnabled}
                            onCheckedChange={(value) => updateResourceChangePreference(group.enabledKey, value)}
                            disabled={savingRules}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {group.items.map((item) => {
                            const itemTitleId = `${item.key}-title`

                            return (
                              <div
                                key={item.key}
                                className={cn(
                                  'rounded-md border px-3 py-2',
                                  groupEnabled ? 'border-border bg-background' : 'border-dashed border-muted-foreground/30 bg-muted/30',
                                )}
                              >
                                <Field orientation="horizontal" className="items-center gap-3">
                                  <FieldTitle id={itemTitleId}>{item.label}</FieldTitle>
                                  <Switch
                                    aria-labelledby={itemTitleId}
                                    checked={preferences.resourceChange[item.key]}
                                    onCheckedChange={(value) => updateResourceChangePreference(item.key, value)}
                                    disabled={savingRules}
                                  />
                                </Field>
                              </div>
                            )
                          })}
                        </div>

                        {!groupEnabled ? (
                          <FieldDescription>当前资源总开关关闭，下面的子开关会保留，但不会生效。</FieldDescription>
                        ) : null}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </FieldSet>

            <Field>
              <Label htmlFor="expiry-days">到期提醒天数</Label>
              <Input
                id="expiry-days"
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                min={1}
                max={365}
                disabled={savingRules}
              />
              <FieldDescription>
                提前多少天发送到期提醒（1-365，默认 30）。
              </FieldDescription>
            </Field>

            <Field>
              <Label>每日推送时间</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={String(notifyHour)}
                  onValueChange={(value) => setNotifyHour(Number(value))}
                  disabled={savingRules}
                >
                  <SelectTrigger className="w-[100px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {String(index).padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={notifyTimezone}
                  onValueChange={setNotifyTimezone}
                  disabled={savingRules}
                >
                  <SelectTrigger className="min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_NOTIFICATION_TIMEZONES.map((timezone) => (
                      <SelectItem key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldDescription>
                外部 Cron 需每小时调用端点，匹配配置时间后发送。
              </FieldDescription>
            </Field>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={handleSaveRules}
                disabled={savingRules}
              >
                {savingRules ? <Loader2 className="animate-spin" /> : null}
                保存通知规则
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通知通道</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={DEFAULT_NOTIFICATION_CHANNEL_TAB} className="gap-4">
            <TabsList className="justify-start gap-2">
              {NOTIFICATION_CHANNEL_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="email">
              <NotificationChannelTabPanel
                title={NOTIFICATION_CHANNEL_TABS[1].title}
                description={NOTIFICATION_CHANNEL_TABS[1].description}
              >
                <FieldGroup>
                  <Field orientation="horizontal">
                    <FieldTitle id="email-channel-title">启用 Email 通道</FieldTitle>
                    <Switch
                      aria-labelledby="email-channel-title"
                      checked={emailEnabled}
                      onCheckedChange={setEmailEnabled}
                      disabled={savingEmail}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="email-smtp-host">SMTP Host</Label>
                    <Input
                      id="email-smtp-host"
                      value={emailHost}
                      onChange={(e) => setEmailHost(e.target.value)}
                      placeholder="例如 smtp.qq.com"
                      disabled={savingEmail}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="email-smtp-port">SMTP 端口</Label>
                    <Input
                      id="email-smtp-port"
                      type="number"
                      value={emailPort}
                      onChange={(e) => setEmailPort(e.target.value)}
                      placeholder="465"
                      min={1}
                      max={65535}
                      disabled={savingEmail}
                    />
                  </Field>

                  <Field orientation="horizontal">
                    <div className="space-y-1">
                      <FieldTitle id="email-secure-title">启用安全连接</FieldTitle>
                      <FieldDescription>通常 465 使用开启，587 常见为关闭后走 STARTTLS。</FieldDescription>
                    </div>
                    <Switch
                      aria-labelledby="email-secure-title"
                      checked={emailSecure}
                      onCheckedChange={setEmailSecure}
                      disabled={savingEmail}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="email-username">SMTP 用户名</Label>
                    <Input
                      id="email-username"
                      value={emailUsername}
                      onChange={(e) => setEmailUsername(e.target.value)}
                      placeholder="通常为邮箱地址或账号名"
                      disabled={savingEmail}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="email-password">SMTP 密码 / 授权码</Label>
                    <Input
                      id="email-password"
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder={emailHasPassword ? '已配置，留空则沿用现有密码或授权码' : '请输入 SMTP 密码或授权码'}
                      disabled={savingEmail}
                    />
                    <FieldDescription>
                      建议优先使用邮箱服务商的授权码，不要直接填写登录密码。
                    </FieldDescription>
                  </Field>

                  <Field>
                    <Label htmlFor="email-from-address">发件邮箱</Label>
                    <Input
                      id="email-from-address"
                      type="email"
                      value={emailFromAddress}
                      onChange={(e) => setEmailFromAddress(e.target.value)}
                      placeholder="noreply@example.com"
                      disabled={savingEmail}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="email-from-name">发件人名称</Label>
                    <Input
                      id="email-from-name"
                      value={emailFromName}
                      onChange={(e) => setEmailFromName(e.target.value)}
                      placeholder="域名管理平台"
                      disabled={savingEmail}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="email-reply-to">Reply-To 邮箱</Label>
                    <Input
                      id="email-reply-to"
                      type="email"
                      value={emailReplyTo}
                      onChange={(e) => setEmailReplyTo(e.target.value)}
                      placeholder="可选，例如 support@example.com"
                      disabled={savingEmail}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="email-recipients">收件人</Label>
                    <Textarea
                      id="email-recipients"
                      value={emailRecipientsText}
                      onChange={(e) => setEmailRecipientsText(e.target.value)}
                      placeholder={'user1@example.com\nuser2@example.com'}
                      disabled={savingEmail}
                    />
                    <FieldDescription>
                      可填写多个收件人，使用逗号或换行分隔。
                    </FieldDescription>
                  </Field>

                  <FieldDescription>
                    测试发送会使用当前已保存的 SMTP 配置发送真实邮件，用于验证连接、鉴权与收件可达；如刚修改配置，请先保存后再测试，成功后会更新最近验证时间。
                  </FieldDescription>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveEmail}
                      disabled={!canSaveEmail || savingEmail}
                    >
                      {savingEmail ? <Loader2 className="animate-spin" /> : null}
                      保存 Email 通道
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendEmailTest}
                      disabled={!canTestEmail || testingEmail}
                    >
                      {testingEmail ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      发送测试
                    </Button>
                  </div>
                </FieldGroup>
              </NotificationChannelTabPanel>
            </TabsContent>

            <TabsContent value="telegram">
              <NotificationChannelTabPanel
                title={NOTIFICATION_CHANNEL_TABS[0].title}
                description={NOTIFICATION_CHANNEL_TABS[0].description}
              >
                <FieldGroup>
                  <Field orientation="horizontal">
                    <FieldTitle id="telegram-channel-title">启用 Telegram 通道</FieldTitle>
                    <Switch
                      aria-labelledby="telegram-channel-title"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                      disabled={savingProvider}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="bot-token">Bot Token</Label>
                    <Input
                      id="bot-token"
                      type="password"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder={hasToken ? '已配置，重新输入将覆盖现有 Token' : '请输入 Bot Token'}
                      disabled={savingProvider}
                    />
                    <FieldDescription>
                      {hasToken
                        ? '已配置 Token。如需更换请重新输入并保存。'
                        : '从 @BotFather 获取的 Bot Token'}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <Label htmlFor="chat-id">Chat ID</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="chat-id"
                        value={chatId}
                        onChange={(e) => setChatId(e.target.value)}
                        placeholder="请输入 Chat ID"
                        disabled={savingProvider}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGetChatId}
                        disabled={fetchingChatId || savingProvider || (!botToken.trim() && !hasToken)}
                      >
                        {fetchingChatId ? <Loader2 className="animate-spin" size={14} /> : '获取'}
                      </Button>
                    </div>
                    <FieldDescription>
                      向 Bot 发送任意消息后点击「获取」自动填入，或手动输入。
                    </FieldDescription>
                  </Field>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveProvider}
                      disabled={!canSaveProvider || savingProvider}
                    >
                      {savingProvider ? <Loader2 className="animate-spin" /> : null}
                      保存 Telegram 通道
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendTest}
                      disabled={!canTest || testing}
                    >
                      {testing ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      发送测试
                    </Button>
                  </div>
                </FieldGroup>
              </NotificationChannelTabPanel>
            </TabsContent>

            <TabsContent value="webhook">
              <NotificationChannelTabPanel
                title={NOTIFICATION_CHANNEL_TABS[2].title}
                description={NOTIFICATION_CHANNEL_TABS[2].description}
              >
                <FieldGroup>
                  <Field orientation="horizontal">
                    <FieldTitle id="webhook-channel-title">启用 Webhook 通道</FieldTitle>
                    <Switch
                      aria-labelledby="webhook-channel-title"
                      checked={webhookEnabled}
                      onCheckedChange={setWebhookEnabled}
                      disabled={savingWebhook}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="webhook-format">Payload 格式</Label>
                    <Select
                      value={webhookFormat}
                      onValueChange={(value) => setWebhookFormat(value as WebhookFormat)}
                      disabled={savingWebhook}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEBHOOK_FORMAT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder={WEBHOOK_FORMAT_OPTIONS.find((opt) => opt.value === webhookFormat)?.placeholder}
                      disabled={savingWebhook}
                    />
                    <FieldDescription>
                      仅支持 HTTPS 地址。
                    </FieldDescription>
                  </Field>

                  <Field>
                    <Label htmlFor="webhook-secret">签名密钥</Label>
                    <Input
                      id="webhook-secret"
                      type="password"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder={webhookHasSecret ? '已配置，留空则沿用现有密钥' : SECRET_LABELS[webhookFormat]}
                      disabled={savingWebhook}
                    />
                    <FieldDescription>{SECRET_LABELS[webhookFormat]}</FieldDescription>
                  </Field>

                  <Field>
                    <Label htmlFor="webhook-mention">消息提醒</Label>
                    <Select
                      value={webhookMentionMode}
                      onValueChange={(value) => setWebhookMentionMode(value as WebhookMentionMode)}
                      disabled={savingWebhook}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MENTION_MODE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      选择 @所有人 触发手机推送通知，或自定义 @ 指定用户。
                    </FieldDescription>
                  </Field>

                  {webhookMentionMode === 'custom' ? (
                    <Field>
                      <Label htmlFor="webhook-mention-targets">@ 目标</Label>
                      <Input
                        id="webhook-mention-targets"
                        value={webhookMentionTargets}
                        onChange={(e) => setWebhookMentionTargets(e.target.value)}
                        placeholder={MENTION_TARGET_PLACEHOLDERS[webhookFormat]}
                        disabled={savingWebhook || webhookFormat === 'generic'}
                      />
                      <FieldDescription>
                        {MENTION_TARGET_DESCRIPTIONS[webhookFormat]}
                      </FieldDescription>
                    </Field>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveWebhook}
                      disabled={!canSaveWebhook || savingWebhook}
                    >
                      {savingWebhook ? <Loader2 className="animate-spin" /> : null}
                      保存 Webhook 通道
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendWebhookTest}
                      disabled={!canTestWebhook || testingWebhook}
                    >
                      {testingWebhook ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      发送测试
                    </Button>
                  </div>
                </FieldGroup>
              </NotificationChannelTabPanel>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
