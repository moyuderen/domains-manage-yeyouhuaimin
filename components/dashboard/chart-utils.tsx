'use client'

import { useMemo } from 'react'
import type { BaseTickContentProps, XAxisTickContentProps } from 'recharts'

const CHART_COLOR_FALLBACKS = [
  'oklch(0.646 0.222 41.116)',
  'oklch(0.6 0.118 184.704)',
  'oklch(0.398 0.07 227.392)',
  'oklch(0.828 0.189 84.429)',
  'oklch(0.769 0.188 70.08)',
  'oklch(0.596 0.15 150)',
  'oklch(0.65 0.25 350)',
  'oklch(0.55 0.2 300)',
  'oklch(0.65 0.12 190)',
  'oklch(0.65 0.22 20)',
  'oklch(0.5 0.2 270)',
  'oklch(0.75 0.18 120)',
] as const

export function getChartColor(index: number) {
  const colorIndex = index % CHART_COLOR_FALLBACKS.length
  return `var(--chart-${colorIndex + 1}, ${CHART_COLOR_FALLBACKS[colorIndex]})`
}

const MAX_LABEL_LEN = 20

export function truncate(name: string) {
  return name.length > MAX_LABEL_LEN ? name.slice(0, MAX_LABEL_LEN) + '…' : name
}

export function TruncatedTick(props: XAxisTickContentProps) {
  const { x, y, payload } = props
  const display = truncate(String(payload.value))
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{String(payload.value)}</title>
      <text
        textAnchor="end"
        transform="rotate(-35)"
        className="fill-muted-foreground text-xs"
      >
        {display}
      </text>
    </g>
  )
}

type UrlMap = Map<string, string | null | undefined>

export function useUrlMap(data: { name: string; websiteUrl?: string | null }[]) {
  return useMemo(() => new Map(data.map((d) => [d.name, d.websiteUrl])), [data])
}

export function createClickableTick(urlMap: UrlMap, options?: { truncateText?: boolean; rotate?: boolean }) {
  return function ClickableTick(props: BaseTickContentProps) {
    const { x, y, payload } = props
    if (!x || !y || !payload) return null
    const name = String(payload.value)
    const display = options?.truncateText ? truncate(name) : name
    const url = urlMap.get(name) ?? undefined

    if (url) {
      return (
        <g transform={`translate(${x},${y})`}>
          <title>{name} — {url}</title>
          <text
            textAnchor="end"
            {...(options?.rotate ? { transform: 'rotate(-35)' } : {})}
            className="cursor-pointer fill-muted-foreground text-xs hover:fill-primary"
            onClick={(e) => {
              e.stopPropagation()
              window.open(url, '_blank', 'noopener,noreferrer')
            }}
          >
            {display}
          </text>
        </g>
      )
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <title>{name}</title>
        <text
          textAnchor="end"
          {...(options?.rotate ? { transform: 'rotate(-35)' } : {})}
          className="fill-muted-foreground text-xs"
        >
          {display}
        </text>
      </g>
    )
  }
}
