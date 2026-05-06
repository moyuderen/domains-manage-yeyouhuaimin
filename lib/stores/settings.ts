import { create } from 'zustand'

export type ProjectTitles = {
  title: string
  subtitle: string
  icon: string
}

type SettingsState = {
  projectTitles: ProjectTitles
  setProjectTitles: (titles: ProjectTitles) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  projectTitles: { title: '管理系统', subtitle: 'Domain Manage', icon: '/icon.svg' },
  setProjectTitles: (projectTitles) => set({ projectTitles }),
}))
