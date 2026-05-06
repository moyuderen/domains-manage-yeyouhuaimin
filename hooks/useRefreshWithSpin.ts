'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const MIN_SPIN_MS = 500

export function useRefreshWithSpin() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [spinning, setSpinning] = useState(false)
  const spinStartRef = useRef(0)
  const spinTimerId = useRef<number | undefined>(undefined)

  const refresh = useCallback(() => {
    if (spinStartRef.current > 0) return
    spinStartRef.current = Date.now()
    setSpinning(true)
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  useEffect(() => {
    if (spinning && !isPending) {
      const elapsed = Date.now() - spinStartRef.current
      const remaining = Math.max(0, MIN_SPIN_MS - elapsed)
      clearTimeout(spinTimerId.current)
      spinTimerId.current = window.setTimeout(() => {
        spinStartRef.current = 0
        setSpinning(false)
      }, remaining)
    }
    return () => clearTimeout(spinTimerId.current)
  }, [spinning, isPending])

  return { spinning, refresh }
}
