export type ThemeMode = 'auto' | 'light' | 'dark'

export const THEME_MODE_STORAGE_KEY = 'theme-mode'
export const THEME_MODE_CHANGE_EVENT = 'theme-mode-change'
export const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'auto' || value === 'light' || value === 'dark'
}

export function getStoredThemeMode() {
  if (typeof window === 'undefined') {
    return 'auto' satisfies ThemeMode
  }

  const storedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
  return isThemeMode(storedMode) ? storedMode : 'auto'
}

export function setStoredThemeMode(mode: ThemeMode) {
  window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
  window.dispatchEvent(new Event(THEME_MODE_CHANGE_EVENT))
}

export function resolveThemeMode(mode: ThemeMode, isDark: boolean) {
  return mode === 'auto' ? (isDark ? 'dark' : 'light') : mode
}

export function getSystemTheme() {
  return resolveThemeMode('auto', window.matchMedia(DARK_MODE_MEDIA_QUERY).matches)
}
