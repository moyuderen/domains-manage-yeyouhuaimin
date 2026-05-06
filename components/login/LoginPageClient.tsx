'use client'

import { useEffect, useState, type ComponentProps } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { loginWithAccessKeyAction } from '@/app/actions/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useSettingsStore } from '@/lib/stores/settings'

const LOGIN_SECRET_STORAGE_KEY = 'login-remembered-secret'

function readRememberedSecret() {
  try {
    const storedSecret = window.localStorage.getItem(LOGIN_SECRET_STORAGE_KEY)
    if (!storedSecret) return null

    return storedSecret.trim() || null
  } catch {
    return null
  }
}

function writeRememberedSecret(secret: string) {
  try {
    window.localStorage.setItem(LOGIN_SECRET_STORAGE_KEY, secret)
  } catch {
    return
  }
}

function clearRememberedSecret() {
  try {
    window.localStorage.removeItem(LOGIN_SECRET_STORAGE_KEY)
  } catch {
    return
  }
}

export function LoginPageClient() {
  const projectTitles = useSettingsStore((s) => s.projectTitles)
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [rememberSecret, setRememberSecret] = useState(false)
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const value = readRememberedSecret()
    if (!value) {
      clearRememberedSecret()
      return
    }

    setSecret(value)
    setRememberSecret(true)
  }, [])

  const handleSubmit = async (event: ComponentProps<'form'>['onSubmit'] extends ((event: infer T) => void) | undefined ? T : never) => {
    event.preventDefault()

    const value = secret.trim()

    if (!value) {
      setError('请输入访问秘钥')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      await loginWithAccessKeyAction(value)

      if (rememberSecret) {
        writeRememberedSecret(value)
      } else {
        clearRememberedSecret()
      }

      toast.success('欢迎回来，正在进入管理后台')
      router.replace('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-500 lg:flex lg:items-center lg:justify-center lg:p-8 xl:p-10 2xl:p-12">
      <div className="flex min-h-screen w-full overflow-hidden lg:min-h-[min(920px,calc(100vh-4rem))] lg:max-w-[1440px] lg:rounded-4xl lg:border lg:border-border/60 lg:bg-background lg:shadow-[0_24px_80px_rgba(15,23,42,0.08)] xl:max-w-[1520px] 2xl:max-w-[1640px] dark:lg:border-white/10 dark:lg:bg-[#050507] dark:lg:shadow-none">
        <div className="relative hidden overflow-hidden bg-[#050505] lg:flex lg:min-w-0 lg:flex-[1.15] lg:flex-col lg:px-14 lg:py-16 xl:px-16 xl:py-18 2xl:px-20 2xl:py-20">
          <div className="absolute inset-0 z-0">
            <div className="absolute -left-[10%] -top-[10%] h-[70%] w-[70%] rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute bottom-0 right-0 h-[40%] w-[40%] rounded-full bg-primary/5 blur-[100px]" />
          </div>

          <div className="relative z-10 flex h-full max-w-xl flex-col justify-center gap-8 xl:gap-10">
            <div className="flex h-20 w-20 items-center justify-center rounded-[2.2rem] bg-white/5 shadow-2xl ring-1 ring-white/10 backdrop-blur-3xl">
              <Image
                src={projectTitles.icon}
                alt="Logo"
                width={48}
                height={48}
                className="drop-shadow-2xl"
                priority
              />
            </div>
            <div className="space-y-5 text-zinc-100">
              <h1 className="text-5xl font-bold tracking-tight xl:text-[3.75rem] xl:leading-[1.05]">
                {projectTitles.subtitle}
              </h1>
              <p className="max-w-lg text-lg font-medium leading-relaxed text-zinc-400 xl:text-xl">
                数字化域名资产管理平台，<br />
                极致简洁，安全可靠。
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-auto text-[11px] font-bold uppercase tracking-[0.4em] text-zinc-700">
            Infrastructure Security Layer
          </div>
        </div>

        <div className="relative flex flex-1 flex-col justify-center border-border/50 bg-background px-8 py-12 dark:bg-[#0c0c0e] lg:min-w-[440px] lg:max-w-[560px] lg:border-l dark:lg:border-white/5 lg:px-14 lg:py-16 xl:px-16 xl:py-18 2xl:px-18 2xl:py-20 lg:shadow-[-20px_0_50px_rgba(0,0,0,0.08)] dark:lg:shadow-none">
          <div
            className="pointer-events-none absolute inset-0 z-0 hidden opacity-[0.03] dark:block"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
          />

          <div className="absolute right-8 top-8 z-20 lg:right-10 lg:top-10">
            <ThemeToggle />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-sm lg:max-w-none">
            <div className="mb-14 text-center lg:hidden">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 shadow-sm ring-1 ring-zinc-200 dark:bg-white/5 dark:ring-white/10">
                <Image src={projectTitles.icon} alt="Logo" width={32} height={32} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{projectTitles.subtitle}</h1>
            </div>

            <div className="mb-10 lg:mb-12">
              <h2 className="mb-3 text-4xl font-bold tracking-tight dark:text-zinc-100 xl:text-[2.625rem] xl:leading-tight">欢迎回来</h2>
              <p className="text-sm font-medium text-muted-foreground lg:text-[15px]">
                请输入您的访问秘钥以继续
              </p>
            </div>

            <form className="space-y-8" onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={Boolean(error) || undefined}>
                  <FieldLabel htmlFor="login-secret" className="mb-3 ml-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 dark:text-zinc-500">
                    Access Key
                  </FieldLabel>
                  <div className="group relative">
                    <Input
                      id="login-secret"
                      type={visible ? 'text' : 'password'}
                      value={secret}
                      onChange={(event) => {
                        setSecret(event.target.value)
                        if (error) setError('')
                      }}
                      placeholder="••••••••••••"
                      autoComplete="off"
                      disabled={submitting}
                      className="h-14 rounded-2xl border-border/40 bg-muted/40 px-5 text-lg transition-all placeholder:opacity-30 focus:border-primary/40 focus:bg-background focus:ring-4 focus:ring-primary/5 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:focus:bg-white/10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-transparent"
                      onClick={() => setVisible((current) => !current)}
                      disabled={submitting}
                    >
                      {visible ? (
                        <EyeOff size={18} className="text-muted-foreground/50" />
                      ) : (
                        <Eye size={18} className="text-muted-foreground/50" />
                      )}
                    </Button>
                  </div>
                  <FieldError className="mt-3 ml-1 text-xs font-semibold text-destructive/90">{error}</FieldError>
                </Field>
              </FieldGroup>

              <Field orientation="horizontal" data-disabled={submitting || undefined}>
                <Checkbox
                  id="remember-secret"
                  checked={rememberSecret}
                  onCheckedChange={(checked) => setRememberSecret(checked === true)}
                  disabled={submitting}
                />
                <FieldLabel htmlFor="remember-secret">记住访问秘钥</FieldLabel>
              </Field>

              <Button
                type="submit"
                className="h-14 w-full rounded-2xl text-base font-bold tracking-wide shadow-xl shadow-primary/10 transition-all active:scale-[0.98] dark:shadow-primary/20 lg:hover:-translate-y-px lg:hover:shadow-primary/30"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                    <span>身份验证中...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>进入管理后台</span>
                    <ArrowRight size={18} />
                  </div>
                )}
              </Button>
            </form>
          </div>

          <div className="relative z-10 mt-auto pt-10 text-center lg:pt-12 lg:text-left">
            <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-muted-foreground/30">
              &copy; {new Date().getFullYear()} {projectTitles.subtitle}<br />
              Security Asset Protocol v2.2
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
