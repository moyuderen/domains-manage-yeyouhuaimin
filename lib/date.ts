import { addDays as dfnsAddDays, differenceInDays as dfnsDifferenceInDays, format, isValid, parseISO, startOfDay } from 'date-fns'

export function formatDate(value: string | null) {
  if (!value) {
    return '未设置'
  }

  return format(new Date(value), 'yyyy/MM/dd')
}

export function getStartOfToday() {
  return startOfDay(new Date())
}

export function differenceInDays(target: string | null) {
  if (!target) {
    return null
  }

  return dfnsDifferenceInDays(new Date(target), getStartOfToday())
}

export function addDays(days: number) {
  return format(dfnsAddDays(new Date(), days), 'yyyy-MM-dd')
}

export function monthLabel(value: string) {
  return format(parseISO(value), 'yyyy-MM')
}

export function dayLabel(value: string) {
  return format(parseISO(value), 'yyyy-MM-dd')
}

export function shortDayLabel(value: string) {
  return format(parseISO(value), 'MM-dd')
}

export function formatDateInTimeZone(value: string | Date, timeZone: string) {
  const parts = getTimeZoneParts(value, timeZone, false)
  if (!parts) {
    return ''
  }

  return `${parts.year}/${parts.month}/${parts.day}`
}

export function formatDateKeyInTimeZone(value: string | Date, timeZone: string) {
  const parts = getTimeZoneParts(value, timeZone, false)
  if (!parts) {
    return ''
  }

  return `${parts.year}-${parts.month}-${parts.day}`
}

export function formatDateTimeInTimeZone(value: string | Date, timeZone: string) {
  const parts = getTimeZoneParts(value, timeZone, true)
  if (!parts) {
    return ''
  }

  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`
}

export function getHourInTimeZone(value: string | Date, timeZone: string) {
  const parts = getTimeZoneParts(value, timeZone, true)
  if (!parts) {
    return null
  }

  return Number.parseInt(parts.hour, 10)
}

export function formatTimeZoneOffset(value: string | Date, timeZone: string) {
  const date = toValidDate(value)
  if (!date) {
    return timeZone
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  })

  return formatter.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value ?? timeZone
}

type TimeZoneParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

function getTimeZoneParts(value: string | Date, timeZone: string, includeTime: boolean): TimeZoneParts | null {
  const date = toValidDate(value)
  if (!date) {
    return null
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }
      : {}),
  })

  const parts = formatter.formatToParts(date)
  const year = readDateTimePart(parts, 'year')
  const month = readDateTimePart(parts, 'month')
  const day = readDateTimePart(parts, 'day')

  if (!year || !month || !day) {
    return null
  }

  if (!includeTime) {
    return {
      year,
      month,
      day,
      hour: '',
      minute: '',
    }
  }

  const hour = readDateTimePart(parts, 'hour')
  const minute = readDateTimePart(parts, 'minute')
  if (!hour || !minute) {
    return null
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
  }
}

function toValidDate(value: string | Date) {
  const date = value instanceof Date ? value : parseISO(value)
  return isValid(date) ? date : null
}

function readDateTimePart(parts: Intl.DateTimeFormatPart[], type: 'year' | 'month' | 'day' | 'hour' | 'minute') {
  return parts.find((part) => part.type === type)?.value ?? ''
}
