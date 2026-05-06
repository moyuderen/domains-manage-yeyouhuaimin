'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'

import {
  DARK_MODE_MEDIA_QUERY,
  getStoredThemeMode,
  getSystemTheme,
  resolveThemeMode,
  THEME_MODE_CHANGE_EVENT,
  THEME_MODE_STORAGE_KEY,
} from '@/lib/theme'

type ThemeProviderProps = {
  children: ReactNode
}

function ThemeController() {
  const { setTheme } = useTheme()

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MODE_MEDIA_QUERY)

    const syncTheme = () => {
      setTheme(resolveThemeMode(getStoredThemeMode(), mediaQuery.matches))
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_MODE_STORAGE_KEY) {
        syncTheme()
      }
    }

    const handleMediaChange = () => {
      if (getStoredThemeMode() === 'auto') {
        setTheme(getSystemTheme())
      }
    }

    syncTheme()
    window.addEventListener('storage', handleStorage)
    window.addEventListener(THEME_MODE_CHANGE_EVENT, syncTheme)
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, syncTheme)
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [setTheme])

  return null
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <ThemeController />
      {children}
    </NextThemesProvider>
  )
}
