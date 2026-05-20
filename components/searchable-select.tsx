'use client'

import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type SearchableSelectOption = {
  label: string
  value: string
}

type SearchableSelectProps = {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  id?: string
  allowCustomValue?: boolean
  formatCustomValueLabel?: (value: string) => string
  normalizeCustomValue?: (value: string) => string
  'aria-invalid'?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = '请选择...',
  searchPlaceholder = '搜索...',
  emptyText = '未找到匹配项',
  className,
  id,
  allowCustomValue = false,
  formatCustomValueLabel = (customValue) => `使用“${customValue}”`,
  normalizeCustomValue = (customValue) => customValue.trim(),
  'aria-invalid': ariaInvalid,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const selected = options.find((option) => option.value === value) ?? (allowCustomValue && value ? { label: value, value } : undefined)
  const customValue = normalizeCustomValue(searchValue)
  const hasCustomValue = allowCustomValue && Boolean(customValue) && !options.some((option) => option.value === customValue)
  const renderedOptions = useMemo(() => {
    if (!hasCustomValue) return options
    return [{ label: formatCustomValueLabel(customValue), value: customValue }, ...options]
  }, [customValue, formatCustomValueLabel, hasCustomValue, options])

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (!nextOpen) setSearchValue('')
    }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          className={cn(
            'w-fit justify-between rounded-md px-3 text-sm font-normal shadow-xs data-placeholder:text-muted-foreground',
            !selected && 'text-muted-foreground',
            className,
          )}
          style={{ height: 'var(--radix-select-trigger-height, 2.25rem)' }}
        >
          {selected ? selected.label : placeholder}
          <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={searchValue} onValueChange={setSearchValue} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {renderedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value)
                    setSearchValue('')
                    setOpen(false)
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 size-4',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
