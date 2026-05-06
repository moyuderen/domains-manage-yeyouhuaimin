'use client'

import { Bell, Check, Loader2, Settings, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { updateProjectTitlesAction } from '@/app/actions/settings'
import { NotificationSettings } from '@/components/settings/notification-settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { NotificationSettingsPageData } from '@/lib/notifications/settings'
import { useSettingsStore } from '@/lib/stores/settings'

const SECTIONS = [
  { id: 'general', label: '通用设置', icon: Settings },
  { id: 'notifications', label: '通知设置', icon: Bell },
] as const

function useScrollSpy(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0])
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [ids])

  return activeId
}

const DEFAULT_ICON = '/icon.svg'

function ProjectTitleSetting() {
  const projectTitles = useSettingsStore((s) => s.projectTitles)
  const setProjectTitles = useSettingsStore((s) => s.setProjectTitles)
  const [title, setTitle] = useState(projectTitles.title)
  const [subtitle, setSubtitle] = useState(projectTitles.subtitle)
  const [icon, setIcon] = useState(projectTitles.icon)
  const [iconError, setIconError] = useState(false)
  const [isPending, startTransition] = useTransition()

  const hasChanges = title.trim() !== projectTitles.title || subtitle.trim() !== projectTitles.subtitle || icon.trim() !== projectTitles.icon
  const isValid = title.trim().length > 0

  const resolvedIcon = iconError || !icon.trim() ? DEFAULT_ICON : icon.trim()

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateProjectTitlesAction(title, subtitle, icon)
        setProjectTitles({ title: title.trim(), subtitle: subtitle.trim(), icon: icon.trim() || DEFAULT_ICON })
        toast.success('项目标题已更新')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '更新失败')
      }
    })
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium">项目标题</div>
          <div className="text-muted-foreground text-sm">自定义侧边栏和登录页显示的项目名称与图标</div>
        </div>

        <div className="space-y-2">
          <label htmlFor="project-icon" className="text-muted-foreground text-xs">
            项目图标
          </label>
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
              <Image
                src={resolvedIcon}
                alt="项目图标"
                width={32}
                height={32}
                className="size-8 rounded object-cover"
                onError={() => setIconError(true)}
              />
            </div>
            <div className="relative flex-1">
              <Input
                id="project-icon"
                value={icon}
                onChange={(e) => { setIcon(e.target.value); setIconError(false) }}
                placeholder="https://example.com/icon.png"
                maxLength={500}
                disabled={isPending}
              />
              {icon && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => { setIcon(''); setIconError(false) }}
                  disabled={isPending}
                >
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-xs">输入 HTTPS 图片地址，留空使用默认图标</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="project-title" className="text-muted-foreground text-xs">
              主标题
            </label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="管理系统"
              maxLength={50}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="project-subtitle" className="text-muted-foreground text-xs">
              副标题
            </label>
            <Input
              id="project-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Domain Manage"
              maxLength={50}
              disabled={isPending}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!hasChanges || !isValid || isPending}
            onClick={handleSave}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Check />}
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

type SettingsPageClientProps = {
  notificationSettings: NotificationSettingsPageData
}

export function SettingsPageClient({ notificationSettings }: SettingsPageClientProps) {
  const sectionIds = SECTIONS.map((s) => s.id)
  const activeId = useScrollSpy(sectionIds)

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className="flex gap-8">
      <nav className="hidden w-44 shrink-0 md:block">
        <div className="sticky top-24 space-y-1">
          {SECTIONS.map((section) => {
            const SectionIcon = section.icon
            const isActive = activeId === section.id
            return (
              <Button
                key={section.id}
                type="button"
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => scrollTo(section.id)}
                className="w-full justify-start gap-2"
              >
                <SectionIcon size={16} />
                {section.label}
              </Button>
            )
          })}
        </div>
      </nav>

      <div className="min-w-0 flex-1 space-y-10">
        <section id="general" className="scroll-mt-24 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">通用设置</h2>
            <p className="text-muted-foreground text-sm">管理应用的基础配置。</p>
          </div>
          <ProjectTitleSetting />
        </section>

        <section id="notifications" className="scroll-mt-24 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">通知设置</h2>
            <p className="text-muted-foreground text-sm">管理通知渠道与提醒偏好。</p>
          </div>
          <NotificationSettings initialConfig={notificationSettings} />
        </section>
      </div>
    </div>
  )
}
