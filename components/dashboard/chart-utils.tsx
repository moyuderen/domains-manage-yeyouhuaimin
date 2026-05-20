'use client'

import { useMemo, useState } from 'react'
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

export const SCROLLABLE_BAR_MIN_WIDTH = 14
export const SCROLLABLE_BAR_MAX_WIDTH = 28
export const SCROLLABLE_BAR_SLOT_MIN_WIDTH = 40

export function getScrollableChartMinWidth(itemCount: number, perItem = SCROLLABLE_BAR_SLOT_MIN_WIDTH, minWidth = 480) {
  return Math.max(itemCount * perItem, minWidth)
}

export function truncate(name: string) {
  return name.length > MAX_LABEL_LEN ? name.slice(0, MAX_LABEL_LEN) + '…' : name
}

export function TruncatedTick(props: XAxisTickContentProps) {
  const { x, y, payload } = props
  if (x == null || y == null || !payload) return null

  const name = String(payload.value)
  const display = truncate(name)

  return (
    <TickLabel
      name={name}
      display={display}
      transform={`translate(${x},${y})`}
      rotate
      className="fill-muted-foreground text-xs"
    />
  )
}

type UrlMap = Map<string, string | null | undefined>

export function useUrlMap(data: { name: string; websiteUrl?: string | null }[]) {
  return useMemo(() => new Map(data.map((d) => [d.name, d.websiteUrl])), [data])
}

export function createClickableTick(urlMap: UrlMap, options?: { truncateText?: boolean; rotate?: boolean }) {
  return function ClickableTick(props: BaseTickContentProps) {
    const { x, y, payload } = props
    if (x == null || y == null || !payload) return null

    const name = String(payload.value)
    const display = options?.truncateText ? truncate(name) : name
    const url = urlMap.get(name) ?? undefined

    return (
      <TickLabel
        name={name}
        display={display}
        transform={`translate(${x},${y})`}
        rotate={options?.rotate}
        className={url ? 'cursor-pointer fill-muted-foreground text-xs hover:fill-primary' : 'fill-muted-foreground text-xs'}
        onClick={url ? (e) => {
          e.stopPropagation()
          window.open(url, '_blank', 'noopener,noreferrer')
        } : undefined}
      />
    )
  }
}

function TickLabel({
  name,
  display,
  transform,
  rotate,
  className,
  onClick,
}: {
  name: string
  display: string
  transform: string
  rotate?: boolean
  className: string
  onClick?: (event: React.MouseEvent<SVGTextElement>) => void
}) {
  const [hovered, setHovered] = useState(false)
  const tooltipWidth = Math.min(Math.max(name.length * 7 + 24, 96), 320)

  return (
    <g transform={transform}>
      <text
        textAnchor="end"
        {...(rotate ? { transform: 'rotate(-35)' } : {})}
        className={className}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {display}
      </text>
      {hovered && (
        <foreignObject
          x={-tooltipWidth / 2}
          y={-44}
          width={tooltipWidth}
          height={40}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div className="relative flex justify-center">
            <div className="rounded-md bg-foreground px-3 py-1.5 text-center text-xs text-background shadow-md">
              {name}
            </div>
            <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 rounded-[2px] bg-foreground" />
          </div>
        </foreignObject>
      )}
    </g>
  )
}
