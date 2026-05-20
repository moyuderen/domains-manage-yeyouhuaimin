import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SearchableSelect } from '@/components/searchable-select'

afterEach(() => {
  cleanup()
})

const OPTIONS = [
  { label: 'Cloudflare', value: 'cloudflare' },
  { label: 'Namecheap', value: 'namecheap' },
  { label: 'GoDaddy', value: 'godaddy' },
]

function getTrigger(container: HTMLElement) {
  return container.querySelector('[data-slot="popover-trigger"]') as HTMLElement
}

function getSearchInput() {
  return screen.getByPlaceholderText('搜索...')
}

function renderSelect(overrides: Partial<Parameters<typeof SearchableSelect>[0]> = {}) {
  const onValueChange = vi.fn()
  const utils = render(
    <SearchableSelect
      options={OPTIONS}
      value=""
      onValueChange={onValueChange}
      {...overrides}
    />,
  )
  const trigger = getTrigger(utils.container)
  return { onValueChange, trigger, ...utils }
}

describe('SearchableSelect', () => {
  it('renders with placeholder when no value selected', () => {
    const { trigger } = renderSelect({ placeholder: '全部注册站点' })
    expect(trigger).toHaveTextContent('全部注册站点')
  })

  it('renders selected option label when value is provided', () => {
    const { trigger } = renderSelect({ value: 'cloudflare' })
    expect(trigger).toHaveTextContent('Cloudflare')
  })

  it('opens popover and shows all options on click', async () => {
    const user = userEvent.setup()
    const { trigger } = renderSelect()

    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Cloudflare')).toBeVisible()
    expect(screen.getByText('Namecheap')).toBeVisible()
    expect(screen.getByText('GoDaddy')).toBeVisible()
  })

  it('calls onValueChange and closes popover on option select', async () => {
    const user = userEvent.setup()
    const { onValueChange, trigger } = renderSelect({ value: '' })

    await user.click(trigger)
    await user.click(screen.getByText('Namecheap'))

    expect(onValueChange).toHaveBeenCalledWith('namecheap')
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })

  it('filters options by search input', async () => {
    const user = userEvent.setup()
    const { trigger } = renderSelect()

    await user.click(trigger)
    await user.type(getSearchInput(), 'Cloud')

    expect(screen.getByText('Cloudflare')).toBeVisible()
    expect(screen.queryByText('Namecheap')).not.toBeInTheDocument()
    expect(screen.queryByText('GoDaddy')).not.toBeInTheDocument()
  })

  it('shows empty text when no options match', async () => {
    const user = userEvent.setup()
    const { trigger } = renderSelect({ emptyText: '无匹配结果' })

    await user.click(trigger)
    await user.type(getSearchInput(), 'xyz-not-exist')

    expect(screen.getByText('无匹配结果')).toBeVisible()
  })

  it('uses custom search placeholder', async () => {
    const user = userEvent.setup()
    const { trigger } = renderSelect({ searchPlaceholder: '搜索注册站点...' })

    await user.click(trigger)

    expect(screen.getByPlaceholderText('搜索注册站点...')).toBeVisible()
  })

  it('closes popover when clicking outside', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <>
        <div data-testid="outside">Outside</div>
        <SearchableSelect options={OPTIONS} value="" onValueChange={vi.fn()} />
      </>,
    )

    const trigger = getTrigger(container)

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByTestId('outside'))
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })

  it('handles empty options list gracefully', async () => {
    const user = userEvent.setup()
    const { trigger } = renderSelect({ options: [] })

    await user.click(trigger)

    expect(screen.getByText('未找到匹配项')).toBeVisible()
  })

  it('renders with muted foreground style when no selection', () => {
    const { trigger } = renderSelect({ value: '' })
    expect(trigger).toHaveClass('text-muted-foreground')
  })

  it('does not apply muted foreground when option is selected', () => {
    const { trigger } = renderSelect({ value: 'cloudflare' })
    expect(trigger).not.toHaveClass('text-muted-foreground')
  })

  it('supports selecting a custom value when enabled', async () => {
    const user = userEvent.setup()
    const { onValueChange, trigger } = renderSelect({
      allowCustomValue: true,
      formatCustomValueLabel: (value) => `使用后缀：${value}`,
      normalizeCustomValue: (value) => value.trim().toLowerCase(),
    })

    await user.click(trigger)
    await user.type(getSearchInput(), 'MC.CC')
    await user.click(screen.getByText('使用后缀：mc.cc'))

    expect(onValueChange).toHaveBeenCalledWith('mc.cc')
  })
})
