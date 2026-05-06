'use client'

import { useEffect } from 'react'

import { useSettingsStore, type ProjectTitles } from '@/lib/stores/settings'

type Props = {
  projectTitles: ProjectTitles
}

export function SettingsHydrator({ projectTitles }: Props) {
  useEffect(() => {
    useSettingsStore.setState({ projectTitles })
  }, [projectTitles])

  return null
}
